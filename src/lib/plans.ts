// Constantes de plan — sûres à importer côté client (aucun accès DB).
export const FREE_LIMITS = {
  maxCourses: 1,
  sessionsPerWeek: 3,
  examMode: false,
} as const;

export type Plan = "free" | "premium";
