"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  GraduationCap,
  Layers,
  Lock,
  ChevronRight,
  FileText,
  PenLine,
} from "lucide-react";
import { AppHeader } from "./app-header";
import { Badge, Card, Progress } from "./ui";
import { useI18n } from "@/lib/i18n";

export interface CourseChapter {
  id: string;
  title: string;
  summary: string;
  keyConcepts: string[];
  questionCount: number;
}

export function CourseView({
  course,
  chapters,
  flashcardCount,
  mastery,
  plan,
  userName,
}: {
  course: { id: string; title: string; sourceName: string | null };
  chapters: CourseChapter[];
  flashcardCount: number;
  mastery: number | null;
  plan: "free" | "premium";
  userName: string | null;
}) {
  const { d } = useI18n();

  return (
    <div className="min-h-dvh">
      <AppHeader name={userName} plan={plan} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" /> {d.course.back}
        </Link>

        <div className="mt-5 flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
            {course.title}
          </h1>
          {course.sourceName && (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <FileText className="size-4" /> {course.sourceName}
            </p>
          )}
        </div>

        {mastery != null && (
          <Card className="mt-6 p-5">
            <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-widest text-zinc-400">
              <span>{d.course.mastery}</span>
              <span className="text-cyan">{mastery}%</span>
            </div>
            <Progress value={mastery} />
          </Card>
        )}

        {/* Actions */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Link href={`/session/${course.id}`}>
              <Card className="group h-full border-violet/25 bg-gradient-to-br from-violet/[0.12] to-transparent p-6 transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(139,92,246,0.5)]">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-cyan">
                  <Mic className="size-5 text-white" />
                </span>
                <h3 className="mt-4 flex items-center gap-1 text-base font-bold text-white">
                  {d.course.practice}
                  <ChevronRight className="size-4 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-cyan" />
                </h3>
                <p className="mt-1 text-sm text-zinc-400">{d.course.practiceDesc}</p>
              </Card>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <Link href={`/session/${course.id}?format=written`}>
              <Card className="group h-full border-cyan/20 bg-gradient-to-br from-cyan/[0.08] to-transparent p-6 transition-all hover:-translate-y-1 hover:border-cyan/40">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan/15 text-cyan">
                  <PenLine className="size-5" />
                </span>
                <h3 className="mt-4 flex items-center gap-1 text-base font-bold text-white">
                  {d.course.written}
                  <ChevronRight className="size-4 text-zinc-500 transition-transform group-hover:translate-x-1 group-hover:text-cyan" />
                </h3>
                <p className="mt-1 text-sm text-zinc-400">{d.course.writtenDesc}</p>
              </Card>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Link href={plan === "premium" ? `/session/${course.id}?mode=exam` : "/pricing"}>
              <Card className="group relative h-full p-6 transition-all hover:-translate-y-1 hover:border-cyan/30">
                {plan !== "premium" && (
                  <Badge variant="amber" className="absolute right-4 top-4">
                    <Lock className="size-3" /> {d.course.premiumOnly}
                  </Badge>
                )}
                <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan/15 text-cyan">
                  <GraduationCap className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-white">{d.course.exam}</h3>
                <p className="mt-1 text-sm text-zinc-400">{d.course.examDesc}</p>
              </Card>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            <Link href={`/flashcards/${course.id}`}>
              <Card className="group h-full p-6 transition-all hover:-translate-y-1 hover:border-emerald/30">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald/15 text-emerald">
                  <Layers className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-white">{d.course.flashcards}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {flashcardCount} · {d.course.flashcardsDesc}
                </p>
              </Card>
            </Link>
          </motion.div>
        </div>

        {/* Chapitres */}
        <h2 className="mt-10 text-lg font-bold text-white">{d.course.chapters}</h2>
        <div className="mt-4 space-y-3">
          {chapters.map((ch, i) => (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm font-black text-cyan">
                    {i + 1}
                  </span>
                  <h3 className="min-w-0 flex-1 text-base font-bold text-white">{ch.title}</h3>
                  <Badge variant="neutral">
                    {ch.questionCount} {d.course.questionsUnit}
                  </Badge>
                </div>
                {ch.summary && (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{ch.summary}</p>
                )}
                {ch.keyConcepts.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {ch.keyConcepts.map((k) => (
                      <Badge key={k} variant="cyan" className="text-[11px]">
                        {k}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
