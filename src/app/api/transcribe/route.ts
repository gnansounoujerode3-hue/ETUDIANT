import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Fallback Whisper : utilisé seulement si la Web Speech API est indisponible
// côté navigateur. Nécessite OPENAI_API_KEY.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rate = await enforceRateLimit(
    req,
    { name: "transcribe", limit: user.plan === "premium" ? 120 : 20, windowSeconds: 60 * 60 },
    user.id
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "whisper_not_configured" }, { status: 501 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
  const ALLOWED_AUDIO_TYPES = new Set([
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/x-wav",
  ]);
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
  }
  if (audio.type && !ALLOWED_AUDIO_TYPES.has(audio.type.toLowerCase())) {
    return NextResponse.json({ error: "unsupported_audio_type" }, { status: 415 });
  }

  const forward = new FormData();
  forward.append("file", audio, "audio.webm");
  forward.append("model", "whisper-1");
  forward.append("language", user.locale === "en" ? "en" : "fr");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: forward,
  });
  if (!res.ok) {
    return NextResponse.json({ error: "transcription_failed" }, { status: 502 });
  }
  const json = (await res.json()) as { text?: string };
  return NextResponse.json({ text: json.text ?? "" });
}
