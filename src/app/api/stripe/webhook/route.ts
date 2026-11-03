import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";

export const runtime = "nodejs";

async function setPremium(userId: string, customerId?: string | null, subId?: string | null) {
  await db
    .insert(subscriptions)
    .values({
      userId,
      plan: "premium",
      status: "active",
      stripeCustomerId: customerId ?? null,
      stripeSubscriptionId: subId ?? null,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: "premium",
        status: "active",
        stripeCustomerId: customerId ?? null,
        stripeSubscriptionId: subId ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!key || !secret || !signature) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 400 });
  }

  const stripe = new Stripe(key);
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (userId) {
      await setPremium(
        userId,
        typeof session.customer === "string" ? session.customer : null,
        typeof session.subscription === "string" ? session.subscription : null
      );
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      await db
        .update(subscriptions)
        .set({ plan: "free", status: "canceled", updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId));
    }
  }

  return NextResponse.json({ received: true });
}
