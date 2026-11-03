"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, TrendingUp, Mic, Target } from "lucide-react";
import { Badge, Button, Card, Progress } from "./ui";
import { useI18n } from "@/lib/i18n";

export interface ChapterStat {
  courseTitle: string;
  chapterTitle: string;
  avg: number;
  answered: number;
}
export interface WeakPoint {
  label: string;
  count: number;
}

function scoreColor(score: number) {
  return score >= 70 ? "text-emerald" : score >= 40 ? "text-amber" : "text-rose";
}
function barClass(score: number) {
  return score >= 70
    ? "bg-gradient-to-r from-emerald to-cyan"
    : score >= 40
      ? "bg-gradient-to-r from-amber to-amber/70"
      : "bg-gradient-to-r from-rose to-rose/70";
}

export function GapsView({
  chapterStats,
  weakPoints,
  totalAnswers,
}: {
  chapterStats: ChapterStat[];
  weakPoints: WeakPoint[];
  totalAnswers: number;
  hasCourses: boolean;
}) {
  const { d } = useI18n();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" /> {d.common.back}
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-rose/15 text-rose">
          <Target className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
            {d.gaps.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{d.gaps.subtitle}</p>
        </div>
      </div>

      {totalAnswers === 0 ? (
        <Card className="mt-10 flex flex-col items-center px-6 py-16 text-center">
          <TrendingUp className="size-8 text-zinc-600" />
          <h2 className="mt-4 text-xl font-bold text-white">{d.gaps.noDataTitle}</h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">{d.gaps.noDataDesc}</p>
          <Link href="/dashboard" className="mt-6">
            <Button>
              <Mic className="size-4" /> {d.dashboard.start}
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Score par chapitre */}
          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              {d.gaps.perChapter}
            </h2>
            <div className="mt-5 space-y-5">
              {chapterStats.map((c, i) => (
                <motion.div
                  key={`${c.courseTitle}-${c.chapterTitle}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{c.chapterTitle}</p>
                      <p className="truncate text-[11px] text-zinc-500">{c.courseTitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] text-zinc-500">
                        {c.answered} {d.gaps.answered}
                      </span>
                      {c.avg < 40 ? (
                        <Badge variant="rose">{d.gaps.priority.high}</Badge>
                      ) : c.avg < 70 ? (
                        <Badge variant="amber">{d.gaps.priority.mid}</Badge>
                      ) : (
                        <Badge variant="emerald">{d.gaps.priority.low}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={c.avg} className="flex-1" barClassName={barClass(c.avg)} />
                    <span className={`w-12 text-right text-sm font-black ${scoreColor(c.avg)}`}>
                      {c.avg}
                      <span className="text-[10px] font-medium text-zinc-500">/100</span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Points faibles */}
          <Card className="h-fit border-amber/15 p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
              <AlertTriangle className="size-4 text-amber" /> {d.gaps.weakPoints}
            </h2>
            <p className="mt-2 text-xs text-zinc-500">{d.gaps.weakDesc}</p>
            <div className="mt-5 space-y-2">
              {weakPoints.length === 0 && (
                <p className="text-sm text-zinc-500">{d.gaps.noDataTitle}</p>
              )}
              {weakPoints.map((w, i) => (
                <motion.div
                  key={w.label}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber/15 text-[11px] font-black text-amber">
                    {w.count}
                  </span>
                  <p className="text-sm leading-snug text-zinc-200">{w.label}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
