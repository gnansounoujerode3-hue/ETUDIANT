import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const key = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  // Le mode démo ne doit jamais accorder Premium sur une instance publique.
  // Il doit être activé explicitement et reste interdit en production.
  if (!key || !priceId) {
    if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_PREMIUM !== "true") {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
    }
    await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        plan: "premium",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          plan: "premium",
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
      });
    return NextResponse.json({ url: "/pricing?upgraded=1", demo: true });
  }

  const stripe = new Stripe(key);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${base}/pricing?upgraded=1`,
    cancel_url: `${base}/pricing?canceled=1`,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
  });

  return NextResponse.json({ url: session.url });
}
