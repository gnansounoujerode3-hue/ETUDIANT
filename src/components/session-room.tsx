"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Volume2,
  VolumeX,
  X,
  Lock,
  RotateCcw,
  Send,
  ChevronDown,
  Home,
  GraduationCap,
  AudioLines,
  Sparkles,
  PenLine,
} from "lucide-react";
import { Badge, Button, Card, SoundWave, Spinner, Textarea } from "./ui";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Phase =
  | "boot"
  | "getting"
  | "speaking"
  | "awaiting"
  | "listening"
  | "evaluating"
  | "exam-saved"
  | "feedback"
  | "finished"
  | "blocked";

interface NextQuestion {
  id: string;
  prompt: string;
  type: string;
  difficulty: number;
  chapterTitle: string | null;
  index: number;
  total: number;
}
interface EvalResult {
  score: number;
  verdict: "correct" | "partiel" | "faux";
  feedback: string;
  missing: string[];
  modelAnswer: string;
}
interface ResultItem {
  prompt: string;
  score: number;
  verdict: string;
}

 
type Rec = any; // SpeechRecognition (non typé nativement)

const TYPE_BADGE: Record<string, { fr: string; variant: "default" | "cyan" | "emerald" }> = {
  definition: { fr: "Définition", variant: "default" },
  application: { fr: "Application", variant: "emerald" },
  explication: { fr: "Explication", variant: "cyan" },
};

// ---------------------------------------------------------------------------
// Anneau de score SVG
// ---------------------------------------------------------------------------
function ScoreRing({ score, size = 84 }: { score: number; size?: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? "#34d399" : score >= 40 ? "#fbbf24" : "#fb7185";
  return (
    <svg width={size} height={size} viewBox="0 0 84 84" className="-rotate-90">
      <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text
        x="42"
        y="42"
        textAnchor="middle"
        dominantBaseline="central"
        transform="rotate(90 42 42)"
        fill="white"
        fontSize="20"
        fontWeight="900"
      >
        {score}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Salle de session orale
// ---------------------------------------------------------------------------
export function SessionRoom({
  courseId,
  courseTitle,
  mode,
  initialInputMode = "oral",
  plan,
}: {
  courseId: string;
  courseTitle: string;
  mode: "practice" | "exam";
  initialInputMode?: "oral" | "written";
  plan: "free" | "premium";
}) {
  const { d, lang } = useI18n();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("boot");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<NextQuestion | null>(null);
  const [askedIds, setAskedIds] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [ttsOn, setTtsOn] = useState(true);
  const [inputMode, setInputMode] = useState<"oral" | "written">(initialInputMode);
  // textMode reste un fallback automatique si Web Speech n'est pas disponible.
  const [textMode, setTextMode] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const phaseRef = useRef(phase);
  const askedRef = useRef<string[]>([]);
  const finalTxRef = useRef("");
  const recRef = useRef<Rec>(null);
  const manualStopRef = useRef(false);
  const bootedRef = useRef(false);
  const ttsRef = useRef(ttsOn);
  const inputModeRef = useRef<"oral" | "written">(initialInputMode);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    ttsRef.current = ttsOn;
  }, [ttsOn]);

  useEffect(() => {
    inputModeRef.current = inputMode;
  }, [inputMode]);

  const ttsLang = lang === "en" ? "en-US" : "fr-FR";
  const exam = mode === "exam";
  const target = exam ? Math.min(10, question?.total ?? 10) : (question?.total ?? 0);

  // -------------------------------------------------------------------------
  // Synthèse vocale
  // -------------------------------------------------------------------------
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!ttsRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) {
        onEnd?.();
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = ttsLang;
      const voices = synth.getVoices();
      const voice =
        voices.find((v) => v.lang.toLowerCase().startsWith(ttsLang.toLowerCase())) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(lang));
      if (voice) u.voice = voice;
      u.rate = 1.02;
      u.pitch = 1.0;
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          onEnd?.();
        }
      };
      u.onend = finish;
      u.onerror = finish;
      // garde-fou si onend ne se déclenche jamais
      setTimeout(finish, Math.min(12000, 1200 + text.length * 90));
      synth.speak(u);
    },
    [ttsLang, lang]
  );

  // -------------------------------------------------------------------------
  // Chargement de la question suivante (priorise les points faibles)
  // -------------------------------------------------------------------------
  const finish = useCallback(
    async (sid: string | null) => {
      if (sid) {
        await fetch("/api/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oralSessionId: sid }),
        }).catch(() => {});
      }
      setPhase("finished");
    },
    []
  );

  const loadNext = useCallback(
    async (asked: string[], sid: string) => {
      setPhase("getting");
      setEvalResult(null);
      setTranscript("");
      setInterim("");
      setShowModel(false);
      finalTxRef.current = "";
      try {
        const res = await fetch("/api/questions/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, oralSessionId: sid, askedIds: asked, mode }),
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const j = await res.json();
        if (!res.ok || j.done || !j.question) {
          await finish(sid);
          return;
        }
        setQuestion(j.question as NextQuestion);
        if (inputModeRef.current === "written") {
          // En mode écrit, la question reste silencieuse et le champ est disponible immédiatement.
          setPhase("awaiting");
        } else {
          setPhase("speaking");
          speak(j.question.prompt, () => {
            if (phaseRef.current === "speaking") setPhase("awaiting");
          });
        }
      } catch {
        await finish(sid);
      }
    },
    [courseId, mode, router, speak, finish]
  );

  // -------------------------------------------------------------------------
  // Démarrage de la session
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, mode }),
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const j = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setBlockedReason(j.error ?? "session_limit");
          setPhase("blocked");
          return;
        }
        if (!res.ok || !j.oralSessionId) {
          setBlockedReason("generic");
          setPhase("blocked");
          return;
        }
        setSessionId(j.oralSessionId);
        await loadNext([], j.oralSessionId);
      } catch {
        setBlockedReason("generic");
        setPhase("blocked");
      }
    })();
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Reconnaissance vocale (Web Speech API)
  // -------------------------------------------------------------------------
  const stopRecognition = useCallback(() => {
    manualStopRef.current = true;
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
  }, []);

  const switchInputMode = useCallback(
    (next: "oral" | "written") => {
      if (next === inputModeRef.current && !textMode) return;
      stopRecognition();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      inputModeRef.current = next;
      setInputMode(next);
      setTextMode(false);
      setTranscript("");
      setInterim("");
      finalTxRef.current = "";
      // La question en cours reste identique : on change seulement le canal de réponse.
      if (phaseRef.current === "speaking" || phaseRef.current === "listening") {
        setPhase("awaiting");
      }
    },
    [stopRecognition, textMode]
  );

  const evaluate = useCallback(
    async (rawTranscript: string) => {
      if (!sessionId || !question) return;
      const tx = rawTranscript.trim();
      if (tx.length < 2) {
        setPhase("awaiting");
        return;
      }
      setPhase("evaluating");
      stopRecognition();
      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oralSessionId: sessionId,
            questionId: question.id,
            transcript: tx,
            responseMode: inputModeRef.current,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error("eval_failed");
        const result = j as EvalResult;
        setEvalResult(result);
        setResults((r) => [...r, { prompt: question.prompt, score: result.score, verdict: result.verdict }]);
        const newAsked = [...askedRef.current, question.id];
        askedRef.current = newAsked;
        setAskedIds(newAsked);
        setTextAnswer("");

        if (exam) {
          // Mode examen : pas de feedback, on enchaîne sans aide.
          setPhase("exam-saved");
          setTimeout(() => void loadNext(newAsked, sessionId), 1400);
        } else {
          setPhase("feedback");
          if (inputModeRef.current === "oral") speak(result.feedback);
        }
      } catch {
        setPhase("awaiting");
      }
    },
    [sessionId, question, exam, loadNext, speak, stopRecognition]
  );

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
     
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setTextMode(true);
      setInputMode("written");
      setPhase("awaiting");
      return;
    }
    try {
      recRef.current?.stop?.();
    } catch {
      /* noop */
    }
    const rec: Rec = new SR();
    rec.lang = ttsLang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
     
    rec.onresult = (e: any) => {
      let inter = "";
      let fin = finalTxRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += (fin ? " " : "") + r[0].transcript.trim();
        else inter += r[0].transcript;
      }
      finalTxRef.current = fin;
      setTranscript(fin);
      setInterim(inter);
    };
     
    rec.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        setTextMode(true);
        setInputMode("written");
        setPhase("awaiting");
      }
    };
    rec.onend = () => {
      // certains navigateurs coupent après un silence : on relance si l'utilisateur n'a pas validé
      if (phaseRef.current === "listening" && !manualStopRef.current) {
        try {
          rec.start();
        } catch {
          /* noop */
        }
      }
    };
    manualStopRef.current = false;
    recRef.current = rec;
    finalTxRef.current = "";
    setTranscript("");
    setInterim("");
    try {
      rec.start();
      setPhase("listening");
    } catch {
      setTextMode(true);
      setInputMode("written");
      setPhase("awaiting");
    }
  }, [ttsLang]);

  const stopAndSend = useCallback(() => {
    stopRecognition();
    const tx = (finalTxRef.current + " " + interim).trim();
    void evaluate(tx);
  }, [interim, evaluate, stopRecognition]);

  const nextQuestion = useCallback(() => {
    if (sessionId) void loadNext(askedRef.current, sessionId);
  }, [loadNext, sessionId]);

  const replayQuestion = useCallback(() => {
    if (question) {
      setPhase("speaking");
      speak(question.prompt, () => {
        if (phaseRef.current === "speaking") setPhase("awaiting");
      });
    }
  }, [question, speak]);

  // -------------------------------------------------------------------------
  // Rendu
  // -------------------------------------------------------------------------
  const avg =
    results.length > 0 ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 0;
  const verdictVariant = (v: string) =>
    v === "correct" ? "emerald" : v === "partiel" ? "amber" : "rose";

  // --- Paywall ---
  if (phase === "blocked") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <Card className="max-w-md p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber/15 text-amber">
            <Lock className="size-6" />
          </span>
          <h1 className="mt-5 text-xl font-black text-white">{d.session.paywall.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {blockedReason === "exam_premium"
              ? d.course.examDesc + " — " + d.common.premium
              : d.session.paywall.desc}
          </p>
          <Link href="/pricing">
            <Button size="lg" className="mt-6 w-full">
              {d.session.paywall.cta}
            </Button>
          </Link>
          <Link href={`/courses/${courseId}`}>
            <Button variant="ghost" className="mt-2 w-full">
              {d.common.back}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // --- Écran de fin ---
  if (phase === "finished") {
    const encouragement =
      avg >= 70
        ? d.session.results.encouragement.high
        : avg >= 40
          ? d.session.results.encouragement.mid
          : d.session.results.encouragement.low;
    return (
      <div className="mx-auto min-h-dvh max-w-2xl px-4 py-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 text-center sm:p-10">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan">
              {exam ? <GraduationCap className="size-6 text-white" /> : <Sparkles className="size-6 text-white" />}
            </span>
            <h1 className="mt-5 text-2xl font-black text-white sm:text-3xl">
              {exam ? d.session.results.examTitle : d.session.results.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">{encouragement}</p>

            <div className="mt-8 flex items-center justify-center gap-8">
              <div className="text-center">
                <ScoreRing score={avg} size={110} />
                <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  {d.session.results.avgScore}
                </p>
              </div>
              {exam && (
                <div className="text-center">
                  <p className="text-5xl font-black text-white">
                    {(avg / 5).toFixed(1).replace(".", ",")}
                    <span className="text-xl text-zinc-500">{d.session.results.outOf20}</span>
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    {d.session.results.grade}
                  </p>
                </div>
              )}
            </div>

            {results.length > 0 && (
              <div className="mt-8 text-left">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  {d.session.results.breakdown}
                </p>
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
                    >
                      <Badge variant={verdictVariant(r.verdict)} className="shrink-0">
                        {r.score}
                      </Badge>
                      <p className="line-clamp-2 text-xs leading-relaxed text-zinc-300">{r.prompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>
                <Home className="size-4" /> {d.session.results.backDash}
              </Button>
              <Button className="flex-1" onClick={() => window.location.reload()}>
                <RotateCcw className="size-4" /> {d.session.results.retry}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // --- Écran principal ---
  const writtenMode = inputMode === "written" || textMode;
  const listening = phase === "listening";
  const busy = phase === "boot" || phase === "getting" || phase === "evaluating" || phase === "speaking";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Barre supérieure */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
          <Link
            href={`/courses/${courseId}`}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white"
          >
            <X className="size-3.5" /> {d.common.close}
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant={exam ? "amber" : "default"} className="shrink-0">
              {exam ? d.session.examMode : d.session.practiceMode}
            </Badge>
            {question && (
              <span className="truncate text-xs text-zinc-400">
                {d.session.questionOf} {Math.min(askedIds.length + 1, target || askedIds.length + 1)}
                {target > 0 && ` / ${target}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!writtenMode && (
              <button
                onClick={() => setTtsOn((v) => !v)}
                title={ttsOn ? d.session.ttsOn : d.session.ttsOff}
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-zinc-300 hover:text-white"
              >
                {ttsOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>
            )}
            {(phase === "awaiting" || phase === "listening" || phase === "feedback" || phase === "speaking" || phase === "evaluating") && (
              <Button
                size="sm"
                variant="ghost"
                disabled={finishing}
                onClick={async () => {
                  setFinishing(true);
                  stopRecognition();
                  await finish(sessionId);
                }}
              >
                {d.session.endEarly}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Le canal peut être changé sans perdre la question ni la progression. */}
      <div className="border-b border-white/[0.05] bg-white/[0.015] px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="hidden text-xs text-zinc-500 sm:block">
            {writtenMode ? d.session.writtenInstruction : d.session.tapToAnswer}
          </p>
          <div className="ml-auto inline-flex rounded-full border border-white/10 bg-black/30 p-1">
            <button
              type="button"
              onClick={() => switchInputMode("oral")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all",
                !writtenMode
                  ? "bg-gradient-to-r from-violet to-cyan text-white shadow-lg"
                  : "text-zinc-400 hover:text-white"
              )}
              aria-pressed={!writtenMode}
              title={d.session.switchToOral}
            >
              <Mic className="size-3.5" /> {d.session.oralInput}
            </button>
            <button
              type="button"
              onClick={() => switchInputMode("written")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all",
                writtenMode
                  ? "bg-gradient-to-r from-cyan to-violet text-white shadow-lg"
                  : "text-zinc-400 hover:text-white"
              )}
              aria-pressed={writtenMode}
              title={d.session.switchToWritten}
            >
              <PenLine className="size-3.5" /> {d.session.writtenInput}
            </button>
          </div>
        </div>
      </div>

      <main className={cn(
        "mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6 sm:px-6",
        writtenMode ? "pb-10" : "pb-40"
      )}>
        {/* Question */}
        <AnimatePresence mode="wait">
          {phase === "boot" || phase === "getting" ? (
            <motion.div
              key="loading"
              className="flex flex-1 flex-col items-center justify-center gap-5 py-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SoundWave bars={7} height={40} />
              <p className="text-sm text-zinc-400">{d.session.connecting}</p>
              <Spinner />
            </motion.div>
          ) : (
            question && (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    {question.chapterTitle && (
                      <Badge variant="neutral" className="max-w-full">
                        <span className="truncate">{question.chapterTitle}</span>
                      </Badge>
                    )}
                    <Badge variant={TYPE_BADGE[question.type]?.variant ?? "default"}>
                      {(lang === "en"
                        ? { definition: "Definition", application: "Application", explication: "Explanation" }[
                            question.type
                          ]
                        : TYPE_BADGE[question.type]?.fr) ?? question.type}
                    </Badge>
                    <span className="ml-auto text-xs text-zinc-500">
                      {"●".repeat(question.difficulty)}
                      <span className="text-zinc-700">{"●".repeat(5 - question.difficulty)}</span>
                    </span>
                  </div>
                  <h1 className="mt-4 text-xl font-bold leading-snug text-white sm:text-2xl">
                    {question.prompt}
                  </h1>
                  {!writtenMode && (
                    <button
                      onClick={replayQuestion}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan hover:underline"
                    >
                      <Volume2 className="size-3.5" /> {d.session.replay}
                    </button>
                  )}
                </Card>

                {/* Zone retour : transcription / évaluation / feedback */}
                <div className="mt-4">
                  {phase === "evaluating" && (
                    <Card className="p-6">
                      <div className="flex items-center gap-3 text-sm text-zinc-300">
                        <Spinner /> {d.session.evaluating}
                      </div>
                    </Card>
                  )}

                  {phase === "exam-saved" && (
                    <Card className="border-cyan/20 bg-cyan/[0.05] p-6">
                      <p className="text-sm text-cyan-100">{d.session.examSilent}</p>
                    </Card>
                  )}

                  {(phase === "listening" || (phase === "awaiting" && (transcript || interim))) && !writtenMode && (
                    <Card className="p-5">
                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                        <AudioLines className="size-3.5 text-cyan" /> {d.session.liveTranscript}
                      </p>
                      <p className="mt-2 min-h-6 text-sm leading-relaxed text-zinc-200">
                        {transcript}
                        <span className="text-zinc-500">{interim ? ` ${interim}` : ""}</span>
                        {!transcript && !interim && (
                          <span className="text-zinc-600">{d.session.listening}</span>
                        )}
                      </p>
                    </Card>
                  )}

                  {phase === "awaiting" && writtenMode && (
                    <Card className="border-cyan/20 bg-cyan/[0.03] p-5 sm:p-6">
                      <p className="flex items-center gap-2 text-xs text-zinc-400">
                        <PenLine className="size-4 text-cyan" />
                        {textMode ? d.session.speechUnsupported : d.session.writtenInstruction}
                      </p>
                      <Textarea
                        className="mt-4 min-h-40 resize-y text-base leading-relaxed"
                        placeholder={d.session.typePlaceholder}
                        value={textAnswer}
                        maxLength={4000}
                        autoFocus
                        onChange={(e) => setTextAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && textAnswer.trim().length >= 2) {
                            e.preventDefault();
                            void evaluate(textAnswer);
                          }
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-600">
                        <span>Ctrl / ⌘ + Enter</span>
                        <span>{textAnswer.length} / 4000</span>
                      </div>
                      <Button
                        className="mt-3 w-full"
                        disabled={textAnswer.trim().length < 2}
                        onClick={() => void evaluate(textAnswer)}
                      >
                        <Send className="size-4" /> {d.session.sendText}
                      </Button>
                    </Card>
                  )}

                  {phase === "feedback" && evalResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Card className="overflow-hidden">
                        <div className="flex items-center gap-5 p-6 sm:p-7">
                          <ScoreRing score={evalResult.score} />
                          <div className="min-w-0">
                            <Badge variant={verdictVariant(evalResult.verdict)}>
                              {d.session.verdicts[evalResult.verdict]}
                            </Badge>
                            <p className="mt-2.5 text-sm leading-relaxed text-zinc-300">
                              {evalResult.feedback}
                            </p>
                          </div>
                        </div>
                        {evalResult.missing.length > 0 && (
                          <div className="border-t border-white/[0.06] px-6 py-4 sm:px-7">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                              {d.session.missing}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {evalResult.missing.map((m) => (
                                <Badge key={m} variant="amber" className="text-[11px]">
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="border-t border-white/[0.06] px-6 py-4 sm:px-7">
                          <button
                            onClick={() => setShowModel((v) => !v)}
                            className="flex w-full items-center justify-between text-xs font-semibold text-cyan"
                          >
                            {d.session.modelAnswer}
                            <ChevronDown
                              className={cn("size-4 transition-transform", showModel && "rotate-180")}
                            />
                          </button>
                          {showModel && (
                            <p className="mt-3 rounded-2xl bg-black/40 p-4 text-sm leading-relaxed text-zinc-300">
                              {evalResult.modelAnswer}
                            </p>
                          )}
                        </div>
                        <div className="p-4 pt-0 sm:px-6">
                          <Button size="lg" className="w-full" onClick={nextQuestion}>
                            {d.session.next}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>

      {/* Barre micro fixe en bas */}
      {!writtenMode && phase !== "boot" && phase !== "getting" && phase !== "feedback" && phase !== "exam-saved" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-ink/85 pb-6 pt-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4">
            <div className="h-10">
              {(listening || phase === "speaking" || phase === "evaluating") && (
                <SoundWave bars={11} height={40} active />
              )}
            </div>
            <button
              onClick={listening ? stopAndSend : startListening}
              disabled={busy && !listening}
              aria-label={listening ? d.session.tapToStop : d.session.tapToAnswer}
              className={cn(
                "relative flex size-20 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50 sm:size-24",
                listening
                  ? "bg-gradient-to-br from-cyan to-violet [animation:pulse-ring-live_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite]"
                  : "bg-gradient-to-br from-violet to-cyan [animation:pulse-ring-soft_2.2s_cubic-bezier(0.4,0,0.2,1)_infinite] hover:brightness-110"
              )}
            >
              {listening ? (
                <Square className="size-7 fill-white text-white" />
              ) : (
                <Mic className="size-8 text-white" />
              )}
            </button>
            <p className="text-center text-xs text-zinc-400">
              {listening ? d.session.tapToStop : d.session.tapToAnswer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
