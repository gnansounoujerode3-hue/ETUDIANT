// Répétition espacée — variante simplifiée de SM-2.
// Les réponses ratées (quality < 3) reviennent presque aussitôt dans la session,
// les réussites sont espacées exponentiellement.

export interface SM2State {
  easiness: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

export interface SM2Result extends SM2State {
  nextDueAt: Date;
  quality: number; // 0..5
}

export function scoreToQuality(score: number): number {
  return Math.max(0, Math.min(5, Math.round(score / 20)));
}

export function sm2Update(prev: Partial<SM2State> | null, score: number): SM2Result {
  const quality = scoreToQuality(score);
  let easiness = prev?.easiness ?? 2.5;
  let intervalDays = prev?.intervalDays ?? 0;
  let repetitions = prev?.repetitions ?? 0;
  let lapses = prev?.lapses ?? 0;

  if (quality < 3) {
    // Échec : on réinitialise la progression et on reprogramme très vite.
    repetitions = 0;
    lapses += 1;
    intervalDays = 0;
    easiness = Math.max(1.3, easiness - 0.2);
    return {
      easiness,
      intervalDays,
      repetitions,
      lapses,
      quality,
      nextDueAt: new Date(Date.now() + 10 * 60 * 1000), // revient dans 10 min
    };
  }

  repetitions += 1;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 3;
  else intervalDays = Math.max(1, Math.round(intervalDays * easiness));

  easiness = Math.max(
    1.3,
    easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return {
    easiness,
    intervalDays,
    repetitions,
    lapses,
    quality,
    nextDueAt: new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000),
  };
}
