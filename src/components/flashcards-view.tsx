"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Repeat2, Layers } from "lucide-react";
import { Badge, Button, Card } from "./ui";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  chapterTitle: string;
}

export function FlashcardsView({
  courseId,
  courseTitle,
  cards,
}: {
  courseId: string;
  courseTitle: string;
  cards: FlashcardItem[];
}) {
  const { d } = useI18n();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const go = (dir: 1 | -1) => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => (i + dir + cards.length) % cards.length), flipped ? 150 : 0);
  };

  const card = cards[index];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" /> {d.flashcards.backToCourse}
      </Link>

      <h1 className="mt-5 text-3xl font-black tracking-tight text-white">
        {d.flashcards.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        {courseTitle} — {d.flashcards.subtitle}
      </p>

      {cards.length === 0 ? (
        <Card className="mt-10 flex flex-col items-center px-6 py-16 text-center">
          <Layers className="size-8 text-zinc-600" />
          <p className="mt-4 text-zinc-400">{d.flashcards.empty}</p>
        </Card>
      ) : (
        <>
          <div className="mt-10 [perspective:1400px]" onClick={() => setFlipped((v) => !v)}>
            <AnimatePresence mode="wait">
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: 40, rotate: 1.5 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: -40, rotate: -1.5 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  className={cn(
                    "relative h-80 cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] sm:h-96",
                    flipped && "[transform:rotateY(180deg)]"
                  )}
                >
                  {/* Recto */}
                  <Card
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]",
                      !flipped && "border-violet/30"
                    )}
                  >
                    <Badge variant="default" className="mb-4">
                      {d.flashcards.front}
                    </Badge>
                    <p className="max-w-md text-lg font-bold leading-snug text-white sm:text-2xl">
                      {card.front}
                    </p>
                    <p className="absolute bottom-5 flex items-center gap-1.5 text-xs text-zinc-500">
                      <Repeat2 className="size-3.5" /> {d.flashcards.tapToFlip}
                    </p>
                  </Card>
                  {/* Verso */}
                  <Card className="absolute inset-0 flex flex-col items-center justify-center border-cyan/30 bg-cyan/[0.04] p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <Badge variant="cyan" className="mb-4">
                      {d.flashcards.back}
                    </Badge>
                    <p className="max-w-lg text-sm leading-relaxed text-zinc-200 sm:text-base">
                      {card.back}
                    </p>
                  </Card>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => go(-1)}>
              <ChevronLeft className="size-4" /> {d.flashcards.prev}
            </Button>
            <div className="text-center">
              <p className="text-sm font-bold text-white">
                {index + 1} <span className="text-zinc-500">/ {cards.length}</span>
              </p>
              <Badge variant="neutral" className="mt-1 max-w-48">
                <span className="truncate">{card.chapterTitle}</span>
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => go(1)}>
              {d.flashcards.nextCard} <ChevronRight className="size-4" />
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
