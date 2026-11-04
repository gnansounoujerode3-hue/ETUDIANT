"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  ClipboardType,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Lock,
} from "lucide-react";
import { Button, Card, Input, Label, SoundWave, Spinner, Textarea } from "./ui";
import { useI18n } from "@/lib/i18n";
import { extractTextFromFile, ExtractError } from "@/lib/extract";
import { cn } from "@/lib/utils";

type Stage = "input" | "extracting" | "review" | "structuring";

export function ImportWizard() {
  const { d } = useI18n();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("input");
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mapExtractError = (e: unknown) => {
    if (e instanceof ExtractError) {
      if (e.code === "unsupported_format") return d.importPage.errors.unsupported;
      if (e.code === "empty_text") return d.importPage.errors.empty;
      if (e.code === "pdf_failed") return d.importPage.errors.pdf;
      if (e.code === "pdf_no_text") return d.importPage.errors.empty;
    }
    return d.importPage.errors.generic;
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        setError("20 Mo max");
        return;
      }
      setError(null);
      setStage("extracting");
      try {
        const extracted = await extractTextFromFile(file);
        setText(extracted);
        setSourceName(file.name);
        if (!title) setTitle(file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "));
        setStage("review");
      } catch (e) {
        setError(mapExtractError(e));
        setStage("input");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title]
  );

  const submit = async () => {
    const payloadText = tab === "paste" && stage === "input" ? pasted : text;
    if (payloadText.trim().length < 200) {
      setError("200 " + (d.importPage.errors.empty.includes("texte") ? "caractères minimum" : "characters minimum"));
      return;
    }
    setError(null);
    setStage("structuring");
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          sourceName: sourceName ?? (tab === "paste" ? "texte collé" : null),
          text: payloadText,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setLimitHit(true);
        setError(d.importPage.errors.limit);
        setStage("input");
        return;
      }
      if (res.status === 429) {
        setError("Trop de tentatives rapprochées. Réessaie dans quelques instants.");
        setStage(tab === "file" && text ? "review" : "input");
        return;
      }
      if (!res.ok) {
        setError(d.importPage.errors.generic);
        setStage(tab === "file" && text ? "review" : "input");
        return;
      }
      router.push(`/courses/${json.courseId}`);
    } catch {
      setError(d.importPage.errors.generic);
      setStage("input");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" /> {d.common.back}
      </Link>

      <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
        {d.importPage.title}
      </h1>
      <p className="mt-2 text-zinc-400">{d.importPage.subtitle}</p>

      <AnimatePresence mode="wait">
        {stage === "structuring" || stage === "extracting" ? (
          <motion.div
            key="busy"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="mt-8 flex flex-col items-center px-6 py-16 text-center">
              <span className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan animate-pulse-ring">
                <Sparkles className="size-6 text-white" />
              </span>
              <SoundWave bars={9} height={36} className="mt-6" />
              <h2 className="mt-5 text-lg font-bold text-white">
                {stage === "extracting" ? d.importPage.extracting : d.importPage.structuring}
              </h2>
              {stage === "structuring" && (
                <p className="mt-2 max-w-sm text-sm text-zinc-400">{d.importPage.structureDesc}</p>
              )}
              <Spinner className="mt-6" />
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mt-8 space-y-5"
          >
            {/* Onglets fichier / texte */}
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(
                [
                  { id: "file", icon: UploadCloud, label: "PDF / DOCX / PPTX" },
                  { id: "paste", icon: ClipboardType, label: "TXT / " + d.importPage.pasteTitle.replace("Ou colle directement ton texte", "texte") },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors",
                    tab === t.id
                      ? "bg-gradient-to-r from-violet to-cyan text-white"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <t.icon className="size-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "file" && stage === "input" && (
              <button
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFile(file);
                }}
                className={cn(
                  "flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-all",
                  dragging
                    ? "border-cyan/60 bg-cyan/[0.06] scale-[1.01]"
                    : "border-white/15 bg-white/[0.02] hover:border-violet/40 hover:bg-violet/[0.04]"
                )}
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-violet/30 to-cyan/20">
                  <UploadCloud className="size-7 text-cyan" />
                </span>
                <p className="mt-5 text-lg font-bold text-white">{d.importPage.dropTitle}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {d.importPage.dropOr}{" "}
                  <span className="font-semibold text-cyan underline underline-offset-4">
                    {d.importPage.browse}
                  </span>
                </p>
                <p className="mt-3 text-xs text-zinc-600">{d.importPage.formats}</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = "";
                  }}
                />
              </button>
            )}

            {tab === "paste" && stage === "input" && (
              <div className="space-y-2">
                <Label>{d.importPage.pasteTitle}</Label>
                <Textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={d.importPage.pastePlaceholder}
                  className="min-h-56"
                />
                <p className="text-xs text-zinc-500">{pasted.trim().length} chars</p>
              </div>
            )}

            {stage === "review" && (
              <Card className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald/15 text-emerald">
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{sourceName}</p>
                    <p className="text-xs text-zinc-500">
                      {text.length.toLocaleString("fr-FR")} caractères extraits
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setStage("input");
                      setText("");
                      setSourceName(null);
                    }}
                    className="ml-auto text-xs text-zinc-500 underline hover:text-white"
                  >
                    {d.importPage.restart}
                  </button>
                </div>
                <p className="line-clamp-4 rounded-2xl bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
                  {text.slice(0, 500)}
                </p>
              </Card>
            )}

            {(stage === "review" || tab === "paste") && (
              <div className="space-y-2">
                <Label htmlFor="course-title">{d.importPage.courseTitle}</Label>
                <Input
                  id="course-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={d.importPage.courseTitlePlaceholder}
                />
              </div>
            )}

            {error && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm",
                  limitHit
                    ? "border-amber/25 bg-amber/10 text-amber-200"
                    : "border-rose/25 bg-rose/10 text-rose-200"
                )}
              >
                {limitHit ? (
                  <Lock className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                )}
                <span className="flex-1">{error}</span>
                {limitHit && (
                  <Link href="/pricing" className="shrink-0 font-bold underline">
                    {d.common.upgrade}
                  </Link>
                )}
              </div>
            )}

            {(stage === "review" || (tab === "paste" && pasted.trim().length > 0)) && (
              <Button size="lg" className="w-full" onClick={submit}>
                <Sparkles className="size-4" /> {d.importPage.create}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
