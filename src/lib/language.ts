export type CourseLanguage = "fr" | "en";

/** Détecte la langue du contenu plutôt que celle de l'interface utilisateur. */
export function detectCourseLanguage(
  text: string,
  fallback: CourseLanguage = "fr"
): CourseLanguage {
  const sample = ` ${text.slice(0, 20_000).toLowerCase().normalize("NFC")} `;
  const words = sample.match(/[a-zà-öø-ÿœæ']+/g) ?? [];
  if (words.length < 20) return fallback;

  const frenchMarkers = new Set([
    "le", "la", "les", "un", "une", "des", "du", "de", "dans", "avec", "pour", "par",
    "sur", "est", "sont", "être", "avoir", "qui", "que", "ce", "cette", "ces", "au", "aux",
    "leur", "leurs", "nous", "vous", "entre", "comme", "mais", "donc", "ainsi", "cours",
  ]);
  const englishMarkers = new Set([
    "the", "a", "an", "of", "to", "in", "with", "for", "by", "on", "is", "are", "be",
    "have", "who", "that", "this", "these", "at", "their", "we", "you", "between", "as",
    "but", "therefore", "thus", "course",
  ]);
  let french = 0;
  let english = 0;
  for (const word of words) {
    if (frenchMarkers.has(word)) french += 1;
    if (englishMarkers.has(word)) english += 1;
  }
  if (/[àâçéèêëîïôùûüÿœ]/i.test(sample)) french += Math.max(3, Math.round(words.length * 0.02));
  if (french > english * 1.2) return "fr";
  if (english > french * 1.2) return "en";
  return fallback;
}
