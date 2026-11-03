"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  BookOpen,
  TrendingUp,
  Mic,
  FileText,
  Lock,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";
import { AppHeader } from "./app-header";
import { Badge, Button, Card, Progress } from "./ui";
import { useI18n } from "@/lib/i18n";
import { FREE_LIMITS } from "@/lib/plans";

export interface DashboardCourse {
  id: string;
  title: string;
  sourceName: string | null;
  createdAt: string;
  questionCount: number;
  chapterCount: number;
  mastery: number | null;
}

export function DashboardView({
  name,
  plan,
  courses,
  sessionsThisWeek,
}: {
  name: string | null;
  plan: "free" | "premium";
  courses: DashboardCourse[];
  sessionsThisWeek: number;
}) {
  const { d } = useI18n();
  const firstName = name?.split(" ")[0];
  const courseLimitReached = plan === "free" && courses.length >= FREE_LIMITS.maxCourses;

  return (
    <div className="min-h-dvh">
      <AppHeader name={name} plan={plan} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Entête */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <motion.h1
              className="text-3xl font-black tracking-tight text-white sm:text-4xl"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {d.dashboard.welcome}
              {firstName ? ` ${firstName}` : ""}
              <span className="text-gradient">.</span>
            </motion.h1>
            <p className="mt-2 text-zinc-400">{d.dashboard.subtitle}</p>
          </div>
          <Link href={courseLimitReached ? "/pricing" : "/courses/new"}>
            <Button size="lg" variant={courseLimitReached ? "soft" : "default"} className="w-full sm:w-auto">
              {courseLimitReached ? <Lock className="size-4" /> : <Plus className="size-4" />}
              {d.dashboard.newCourse}
            </Button>
          </Link>
        </div>

        {/* Statistiques */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-zinc-400">
              <CalendarCheck className="size-4 text-cyan" />
              <p className="text-xs font-semibold uppercase tracking-widest">
                {d.dashboard.sessionsWeek}
              </p>
            </div>
            <p className="mt-3 text-2xl font-black text-white">
              {plan === "premium"
                ? d.dashboard.unlimited
                : `${sessionsThisWeek} / ${FREE_LIMITS.sessionsPerWeek}`}
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-zinc-400">
              <BookOpen className="size-4 text-violet" />
              <p className="text-xs font-semibold uppercase tracking-widest">
                {d.dashboard.myCourses}
              </p>
            </div>
            <p className="mt-3 text-2xl font-black text-white">
              {courses.length}
              {plan === "free" && (
                <span className="ml-1 text-sm font-medium text-zinc-500">/ {FREE_LIMITS.maxCourses}</span>
              )}
            </p>
          </Card>
          <Link href="/lacunes" className="col-span-2 lg:col-span-1">
            <Card className="group h-full p-5 transition-colors hover:border-violet/30">
              <div className="flex items-center gap-2 text-zinc-400">
                <TrendingUp className="size-4 text-rose" />
                <p className="text-xs font-semibold uppercase tracking-widest">
                  {d.dashboard.gapsTitle}
                </p>
                <ArrowRight className="ml-auto size-4 text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-violet" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{d.dashboard.gapsDesc}</p>
            </Card>
          </Link>
        </div>

        {courseLimitReached && (
          <Card className="mt-6 flex items-center gap-3 border-amber/20 bg-amber/[0.06] p-4 text-sm text-amber-200">
            <Lock className="size-4 shrink-0" />
            {d.dashboard.limitReached}
          </Card>
        )}

        {/* Liste des cours */}
        <h2 className="mt-10 text-lg font-bold text-white">{d.dashboard.myCourses}</h2>
        {courses.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center px-6 py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-violet/25 to-cyan/20">
              <FileText className="size-7 text-cyan" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-white">{d.dashboard.emptyTitle}</h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-400">{d.dashboard.emptyDesc}</p>
            <Link href="/courses/new" className="mt-6">
              <Button size="lg">
                <Plus className="size-4" /> {d.dashboard.emptyCta}
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
              >
                <Link href={`/courses/${course.id}`}>
                  <Card className="group flex h-full flex-col p-6 transition-all hover:-translate-y-1 hover:border-violet/30">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet/25 to-cyan/15 text-cyan">
                        <BookOpen className="size-5" />
                      </span>
                      {course.mastery != null && (
                        <Badge variant={course.mastery >= 70 ? "emerald" : course.mastery >= 40 ? "amber" : "rose"}>
                          {course.mastery}%
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-4 line-clamp-2 text-base font-bold leading-snug text-white">
                      {course.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {course.chapterCount} {d.dashboard.chapters} · {course.questionCount}{" "}
                      {d.dashboard.questions}
                    </p>
                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                        <span>{d.dashboard.mastery}</span>
                        <span>{course.mastery != null ? `${course.mastery}%` : "—"}</span>
                      </div>
                      <Progress value={course.mastery ?? 0} />
                    </div>
                    <div className="mt-5">
                      <Button variant="outline" size="sm" className="w-full group-hover:border-violet/40">
                        <Mic className="size-3.5" /> {d.dashboard.start}
                      </Button>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
