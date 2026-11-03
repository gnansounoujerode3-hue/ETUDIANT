import { NextRequest, NextResponse } from "next/server";
import { consumeAuthTicket, createSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pont d'authentification pour les prévisualisations embarquées.
 * Le ticket expire après 5 minutes et est supprimé atomiquement dès lecture.
 */
export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get("ticket") ?? "";
  const userId = await consumeAuthTicket(ticket);

  if (!userId) {
    // Location relative : le navigateur conserve toujours le domaine public,
    // même derrière un reverse proxy qui expose une URL interne à Next.js.
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/login?mode=login&error=ticket_expired" },
    });
  }

  await createSession(userId);
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/dashboard" },
  });
}
