import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { clamp } from "./utils";

export type Lang = "fr" | "en";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const MAX_SOURCE_CHARS = 30_000;
const MAX_CHAPTERS = 8;
const MAX_QUESTIONS_PER_CHAPTER = 4;
const MAX_FLASHCARDS_PER_CHAPTER = 4;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface StructuredQuestion {
  type: "definition" | "application" | "explication";
  difficulty: number; // 1..5
  prompt: string;
  modelAnswer: string;
  keyPoints: string[];
}
export interface StructuredFlashcard {
  front: string;
  back: string;
}
export interface StructuredChapter {
  title: string;
  summary: string;
  keyConcepts: string[];
  questions: StructuredQuestion[];
  flashcards: StructuredFlashcard[];
}
export interface StructuredCourse {
  title: string;
  chapters: StructuredChapter[];
}
export interface Evaluation {
  score: number; // 0..100
  verdict: "correct" | "partiel" | "faux";
  feedback: string;
  missing: string[];
}

// ---------------------------------------------------------------------------
// Client Anthropic (optionnel : sans clé, fallback heuristique local)
// ---------------------------------------------------------------------------
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey, maxRetries: 1, timeout: 55_000 });
}

function messageText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function parseJsonLoose<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    /* ignore */
  }
  const cleaned = raw.replace(/```(?:json)?/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1)) as T;
    } catch {
      /* ignore */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Structuration d'un cours : chapitres, concepts, questions, flashcards
// ---------------------------------------------------------------------------
export async function structureCourse(
  rawText: string,
  sourceName: string,
  lang: Lang
): Promise<StructuredCourse> {
  const text = rawText.replace(/[ \t]+\n/g, "\n").slice(0, MAX_SOURCE_CHARS);
  const client = getClient();
  if (client && text.trim().length > 200) {
    try {
      const system =
        lang === "en"
          ? `You are Voxa, a teaching assistant that turns raw course material into a structured oral-exam program. STRICT RULES: use ONLY information present in the provided course; vary question types (definition, application, explain-in-your-own-words); increasing difficulty from 1 to 5; 2 to 4 questions per chapter; every question has a short model answer (2-4 sentences) and 3 to 6 checkable key points; 2 to 4 flashcards per chapter (front = concept/question, back = concise answer). Reply EXCLUSIVELY with valid JSON matching: {"title": string, "chapters": [{"title": string, "summary": string, "keyConcepts": string[], "questions": [{"type": "definition"|"application"|"explication", "difficulty": 1|2|3|4|5, "prompt": string, "modelAnswer": string, "keyPoints": string[]}], "flashcards": [{"front": string, "back": string}]}]}.`
          : `Tu es Voxa, un assistant pédagogique qui transforme un cours brut en programme d'interrogation orale structuré. RÈGLES STRICTES : utilise UNIQUEMENT les informations présentes dans le cours fourni ; varie les types de questions (définition, application, explication avec ses propres mots) ; difficulté croissante de 1 à 5 ; 2 à 4 questions par chapitre ; chaque question a une réponse modèle courte (2 à 4 phrases) et 3 à 6 points clés vérifiables ; 2 à 4 flashcards par chapitre (recto = concept/question, verso = réponse concise). Réponds EXCLUSIVEMENT en JSON valide correspondant à : {"title": string, "chapters": [{"title": string, "summary": string, "keyConcepts": string[], "questions": [{"type": "definition"|"application"|"explication", "difficulty": 1|2|3|4|5, "prompt": string, "modelAnswer": string, "keyPoints": string[]}], "flashcards": [{"front": string, "back": string}]}]}.`;
      const user =
        lang === "en"
          ? `Here is a raw course ("${sourceName}"). Split it into 3 to 8 coherent chapters and output the requested JSON structure.\n\nCOURSE:\n"""${text}"""`
          : `Voici un cours brut (« ${sourceName} »). Découpe-le en 3 à 8 chapitres cohérents et produis la structure JSON demandée.\n\nCOURS :\n"""${text}"""`;
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system,
        messages: [
          { role: "user", content: user },
          { role: "assistant", content: "{" }, // pré-remplissage : force du JSON
        ],
      });
      const parsed = parseJsonLoose<StructuredCourse>("{" + messageText(msg));
      const sanitized = parsed ? sanitizeCourse(parsed, sourceName, lang) : null;
      if (sanitized && sanitized.chapters.length > 0) return sanitized;
    } catch {
      // tombe en heuristique locale
    }
  }
  return fallbackStructure(text, sourceName, lang);
}

const QUESTION_TYPES = new Set(["definition", "application", "explication"]);

function sanitizeCourse(
  raw: StructuredCourse,
  sourceName: string,
  lang: Lang
): StructuredCourse {
  const chapters = (Array.isArray(raw.chapters) ? raw.chapters : [])
    .slice(0, MAX_CHAPTERS)
    .map((c, i) => {
      const questions = (Array.isArray(c.questions) ? c.questions : [])
        .slice(0, MAX_QUESTIONS_PER_CHAPTER)
        .filter((q) => q && typeof q.prompt === "string" && q.prompt.trim().length > 5)
        .map((q) => ({
          type: (QUESTION_TYPES.has(q.type) ? q.type : "explication") as StructuredQuestion["type"],
          difficulty: clamp(Math.round(Number(q.difficulty) || 1), 1, 5),
          prompt: String(q.prompt).trim(),
          modelAnswer: String(q.modelAnswer || "").trim(),
          keyPoints: (Array.isArray(q.keyPoints) ? q.keyPoints : [])
            .map((k) => String(k).trim())
            .filter(Boolean)
            .slice(0, 6),
        }));
      const flashcards = (Array.isArray(c.flashcards) ? c.flashcards : [])
        .slice(0, MAX_FLASHCARDS_PER_CHAPTER)
        .filter((f) => f && f.front && f.back)
        .map((f) => ({ front: String(f.front).trim(), back: String(f.back).trim() }));
      return {
        title: (c.title || "").trim() || (lang === "en" ? `Chapter ${i + 1}` : `Chapitre ${i + 1}`),
        summary: (c.summary || "").trim(),
        keyConcepts: (Array.isArray(c.keyConcepts) ? c.keyConcepts : [])
          .map((k) => String(k).trim())
          .filter(Boolean)
          .slice(0, 6),
        questions,
        flashcards,
      };
    })
    .filter((c) => c.questions.length > 0);
  return {
    title: (raw.title || "").trim() || sourceName.replace(/\.[a-z]+$/i, ""),
    chapters,
  };
}

// ---------------------------------------------------------------------------
// Fallback local (aucune clé API) : heuristique déterministe
// ---------------------------------------------------------------------------
const STOPWORDS = new Set(
  (
    "dans pour avec sont cette cette entre comme plus leur leurs être avoir fait faire peut tous toutes chez sans sous très alors ainsi quand quelle quels aussi cela celle celles ceux dont vers après avant pendant contre selon notre votre nous vous on ne pas des les une aux est du au et ou il elle they their there which where when what with from that this have been will would could should about into over under between because therefore however these those them then than each other such only also some more most many much very your you the and for are but not all can its our out use one two may " +
    "est une des les dans sur par pour aux ces ses son sa ne pas qui que au ou et du il en un le la " +
    // adjectifs/adverbes et noms génériques FR à exclure des concepts-clés
    "lumineux lumineuse lumineuses verte vert vertes bleu bleue rouge noir blanc blanche petit petite grande grand autres autre même mêmes premier première dernier dernière nouveau nouvelle bon bonne mauvais important importante essentiel essentielle principal principale principaux fondamental fondamentale processus phase niveau partie forme point exemple type raison chose choses fois nom nombre lieu groupe suite temps manière moyen moyenne valeur présence permet permettent appelé appelée grâce notamment encore déjà souvent parfois toujours jamais presque environ chaque plusieurs certain certains certaine certaines selon lors lorsque ainsi alors donc car dont où " +
    "principalement généralement vraiment réellement actuellement finalement seulement rapidement lentement simplement totalement complètement particulièrement directement indirectement exactement également mieux cependant néanmoins parfois toujours"
  ).split(/\s+/)
);

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?\n]+[.!?]+(\s|$)|[^.!?\n]+$/g);
  return (matches ?? []).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 4);
}

function topConcepts(text: string, n: number): string[] {
  const freq = new Map<string, { count: number; display: string }>();
  for (const m of text.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ'-]{4,}/g)) {
    // enlève les articles élidés (l', d', qu'…) capturés par le regex
    const raw = m[0].replace(/^(?:l|d|j|s|t|n|m|c|qu|jusqu|lorsqu|puisqu|quoiqu)['’]/i, "");
    if (raw.length < 5) continue;
    const key = raw.toLowerCase();
    if (STOPWORDS.has(key)) continue;
    const entry = freq.get(key) ?? { count: 0, display: raw };
    entry.count += 1;
    // préfère une forme capitalisée au milieu de phrase si disponible
    if (raw[0] === raw[0].toUpperCase() && entry.display[0] !== entry.display[0].toUpperCase())
      entry.display = raw;
    freq.set(key, entry);
  }
  const all = [...freq.values()].sort(
    (a, b) => b.count - a.count || b.display.length - a.display.length
  );
  const frequent = all.filter((v) => v.count >= 2);
  return (frequent.length >= n ? frequent : all).slice(0, n).map((v) => v.display);
}

function fallbackStructure(text: string, sourceName: string, lang: Lang): StructuredCourse {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  const paragraphs = clean.split(/\n{2,}|\n(?=[A-ZÉÈ0-9#].{0,80}\n)/).filter((p) => p.trim().length > 0);
  const joined = paragraphs.join("\n\n") || clean;

  // Découpe en blocs d'environ 900 caractères (~ 1 notion par chapitre).
  const chunks: string[] = [];
  let current = "";
  for (const p of joined.split(/\n{2,}/)) {
    if ((current + "\n\n" + p).length > 900 && current.length > 250) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
    if (chunks.length >= MAX_CHAPTERS) break;
  }
  if (current.trim() && chunks.length < MAX_CHAPTERS) chunks.push(current.trim());
  if (chunks.length === 0 && clean) chunks.push(clean.slice(0, 900));

  const frL = lang === "fr";
  const baseTitle = sourceName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();

  const chapters: StructuredChapter[] = chunks.map((chunk, idx) => {
    const sentences = splitSentences(chunk);
    const firstLine = chunk.split("\n")[0]?.trim() ?? "";
    const concepts = topConcepts(chunk, 5);
    const conceptTitle = concepts[0]
      ? concepts[0][0].toUpperCase() + concepts[0].slice(1)
      : "";
    const title =
      firstLine.length >= 6 && firstLine.length <= 90 && !/[.!?]$/.test(firstLine)
        ? firstLine.replace(/^#+\s*/, "")
        : conceptTitle || (frL ? `Chapitre ${idx + 1}` : `Chapter ${idx + 1}`);
    const summary = sentences.slice(0, 2).join(" ").slice(0, 320) || chunk.slice(0, 240).trim();
    const c0 = concepts[0] ?? title;
    const c1 = concepts[1] ?? concepts[0] ?? title;
    const sentenceWith = (term: string) =>
      sentences.find((s) => s.toLowerCase().includes(term.toLowerCase()))?.slice(0, 260) ||
      summary;

    const prompts: { type: StructuredQuestion["type"]; difficulty: number; prompt: string }[] = frL
      ? [
          { type: "definition", difficulty: 1, prompt: `Définis « ${c0} » avec tes propres mots, comme si tu l'expliquais à un ami.` },
          { type: "explication", difficulty: 2, prompt: `Explique ce qu'on entend par « ${c1} » dans ce chapitre et pourquoi c'est important.` },
          { type: "application", difficulty: 3, prompt: `Donne un exemple concret tiré du cours qui illustre « ${c0} ».` },
        ]
      : [
          { type: "definition", difficulty: 1, prompt: `Define "${c0}" in your own words, as if explaining it to a friend.` },
          { type: "explication", difficulty: 2, prompt: `Explain what "${c1}" means in this chapter and why it matters.` },
          { type: "application", difficulty: 3, prompt: `Give a concrete example from the course that illustrates "${c0}".` },
        ];

    const questions: StructuredQuestion[] = prompts.map((p) => ({
      ...p,
      modelAnswer: summary,
      keyPoints: concepts.slice(0, 4),
    }));
    const flashcards: StructuredFlashcard[] = concepts.slice(0, 4).map((c) => ({
      front: frL ? `Que retenir sur « ${c} » ?` : `What should you remember about "${c}"?`,
      back: sentenceWith(c),
    }));

    return { title, summary, keyConcepts: concepts, questions, flashcards };
  });

  return {
    title: baseTitle || (frL ? "Mon cours" : "My course"),
    chapters: chapters.filter((c) => c.questions.length > 0),
  };
}

// ---------------------------------------------------------------------------
// Évaluation d'une réponse orale
// ---------------------------------------------------------------------------
export async function evaluateAnswer(input: {
  question: string;
  modelAnswer: string;
  keyPoints: string[];
  transcript: string;
  courseTitle: string;
  lang: Lang;
}): Promise<Evaluation> {
  const { lang } = input;
  const transcript = input.transcript.trim();
  if (transcript.length < 3) {
    return {
      score: 0,
      verdict: "faux",
      feedback:
        lang === "en"
          ? "I didn't catch an answer. Speak clearly into the mic and try again!"
          : "Je n'ai pas entendu de réponse. Parle clairement dans le micro et réessaie !",
      missing: input.keyPoints.slice(0, 3),
    };
  }
  const client = getClient();
  if (client) {
    try {
      const system =
        lang === "en"
          ? `You are Voxa, a kind examiner assessing a student's SPOKEN answer against their course. Address the student with "you". Be brief (max 60 words of feedback) and encouraging. Score from 0 to 100 based on factual accuracy and completeness versus the model answer and key points (transcription may contain speech-to-text noise: judge the meaning, not spelling). verdict: "correct" (>=70), "partiel" (40-69), "faux" (<40). List up to 4 missing or wrong elements. Reply EXCLUSIVELY with valid JSON: {"score": number, "verdict": "correct"|"partiel"|"faux", "feedback": string, "missing": string[]}.`
          : `Tu es Voxa, un examinateur bienveillant qui évalue la réponse ORALE d'un étudiant en la comparant à son cours. Tu tutoies l'étudiant. Sois bref (60 mots max de feedback) et encourageant. Score de 0 à 100 selon l'exactitude et la complétude par rapport à la réponse modèle et aux points clés (la transcription peut contenir du bruit de reconnaissance vocale : juge le sens, pas l'orthographe). verdict : "correct" (>=70), "partiel" (40-69), "faux" (<40). Liste jusqu'à 4 éléments manquants ou faux. Réponds EXCLUSIVEMENT en JSON valide : {"score": number, "verdict": "correct"|"partiel"|"faux", "feedback": string, "missing": string[]}.`;
      const user =
        lang === "en"
          ? `Course: ${input.courseTitle}\nQuestion asked: ${input.question}\nModel answer: ${input.modelAnswer}\nKey points expected: ${input.keyPoints.join(" | ")}\nStudent's spoken answer (transcript): """${transcript.slice(0, 2000)}"""`
          : `Cours : ${input.courseTitle}\nQuestion posée : ${input.question}\nRéponse modèle : ${input.modelAnswer}\nPoints clés attendus : ${input.keyPoints.join(" | ")}\nRéponse orale de l'étudiant (transcription) : """${transcript.slice(0, 2000)}"""\``;
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        system,
        messages: [
          { role: "user", content: user.replace(/`$/, "") },
          { role: "assistant", content: "{" },
        ],
      });
      const parsed = parseJsonLoose<Evaluation>("{" + messageText(msg));
      if (parsed && typeof parsed.score === "number") {
        const score = clamp(Math.round(parsed.score), 0, 100);
        return {
          score,
          verdict:
            parsed.verdict === "correct" || parsed.verdict === "partiel"
              ? parsed.verdict
              : score >= 70
                ? "correct"
                : score >= 40
                  ? "partiel"
                  : "faux",
          feedback: String(parsed.feedback || "").slice(0, 500),
          missing: (Array.isArray(parsed.missing) ? parsed.missing : [])
            .map((m) => String(m))
            .filter(Boolean)
            .slice(0, 4),
        };
      }
    } catch {
      // fallback heuristique ci-dessous
    }
  }
  return fallbackEvaluate(input);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokens(s: string): Set<string> {
  const set = new Set<string>();
  for (const m of normalize(s).matchAll(/[a-z0-9]{3,}/g)) {
    if (!STOPWORDS.has(m[0])) set.add(m[0]);
  }
  return set;
}

function fallbackEvaluate(input: {
  modelAnswer: string;
  keyPoints: string[];
  transcript: string;
  lang: Lang;
}): Evaluation {
  const said = tokens(input.transcript);
  const saidText = normalize(input.transcript);
  const keyPoints = input.keyPoints.filter(Boolean);
  const coveredPoints = keyPoints.filter((kp) => {
    const kpTokens = tokens(kp);
    if (kpTokens.size === 0) return false;
    let hit = 0;
    for (const t of kpTokens) if (said.has(t) || saidText.includes(t)) hit += 1;
    return hit / kpTokens.size >= 0.5;
  });
  const kpRatio = keyPoints.length ? coveredPoints.length / keyPoints.length : 0.5;

  const modelTokens = tokens(input.modelAnswer);
  let overlap = 0;
  for (const t of modelTokens) if (said.has(t)) overlap += 1;
  const modelRatio = modelTokens.size ? Math.min(1, overlap / Math.min(modelTokens.size, 14)) : 0.5;

  const lengthBonus = Math.min(1, input.transcript.split(/\s+/).length / 25);
  const raw = kpRatio * 0.55 + modelRatio * 0.3 + lengthBonus * 0.15;
  const score = clamp(Math.round(raw * 100), 3, 97);
  const verdict: Evaluation["verdict"] = score >= 70 ? "correct" : score >= 40 ? "partiel" : "faux";
  const missing = keyPoints
    .filter((kp) => !coveredPoints.includes(kp))
    .slice(0, 4)
    .map((kp) => (kp.length > 70 ? kp.slice(0, 67) + "…" : kp));

  const frL = input.lang === "fr";
  const feedback =
    verdict === "correct"
      ? frL
        ? "Très bonne réponse, tu maîtrises les notions essentielles. Continue comme ça !"
        : "Great answer, you've mastered the core notions. Keep it up!"
      : verdict === "partiel"
        ? frL
          ? "C'est un bon début, mais ta réponse reste incomplète. Regarde les points manquants et réexplique à voix haute."
          : "Good start, but your answer is incomplete. Check the missing points and explain them out loud again."
        : frL
          ? "On va retravailler ce point ensemble : relis la réponse modèle, puis réessaie avec tes propres mots."
          : "Let's rework this together: read the model answer, then try again in your own words.";

  return { score, verdict, feedback, missing };
}
