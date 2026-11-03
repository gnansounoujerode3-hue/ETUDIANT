# Voxa 🎙️ — L'IA qui te fait réviser à voix haute

Importe ton cours (PDF, DOCX, PPTX, TXT). Voxa le structure avec Claude, t'interroge **à l'oral**
comme un examinateur, écoute ta réponse (Web Speech API), la note sur 100, repère tes lacunes et
te fait retravailler tes points faibles grâce à une **répétition espacée type SM-2**.

## Stack

| Couche | Techno |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Style | Tailwind CSS v4, composants façon shadcn/ui (`src/components/ui.tsx`) |
| Base de données | PostgreSQL via Drizzle ORM (compatible **Supabase** : changez `DATABASE_URL`) |
| Auth | Cookies httpOnly + table `auth_sessions` (scrypt) — remplaçable par Supabase Auth |
| IA | API Claude (Anthropic) via `@anthropic-ai/sdk`, fallback heuristique local sans clé |
| Voix | Web Speech API (STT) + Web Speech Synthesis (TTS) ; fallback **Whisper** (`/api/transcribe`) |
| Paiements | Stripe Checkout + webhook (mode démo sans clé) |
| i18n | Français / Anglais (`src/lib/i18n-dictionaries.ts` + provider React) |

## Structure des dossiers

```
src/
├── app/
│   ├── page.tsx                    # Landing (#030303, hero, 3 étapes, avis, FAQ, compteur)
│   ├── login/page.tsx              # Inscription / connexion (email + Google placeholder)
│   ├── dashboard/page.tsx          # Cours, progression, "Nouveau cours"
│   ├── courses/new/page.tsx        # Import drag & drop + collage de texte
│   ├── courses/[id]/page.tsx       # Chapitres, concepts, accès session/examen/flashcards
│   ├── session/[courseId]/page.tsx # ⭐ Écran de session orale
│   ├── flashcards/[courseId]/page.tsx
│   ├── lacunes/page.tsx            # Score par chapitre + points à retravailler
│   ├── pricing/page.tsx            # Gratuit vs Premium 7,99 €/mois
│   └── api/
│       ├── auth/[action]/route.ts  # register | login | logout | me | google
│       ├── courses/route.ts        # GET liste · POST crée + structure via Claude
│       ├── sessions/route.ts       # POST démarre (limites) · PATCH termine
│       ├── questions/next/route.ts # Sélection SM-2 : les lacunes d'abord
│       ├── evaluate/route.ts       # Score 0-100 + mise à jour SM-2
│       ├── stripe/checkout + webhook
│       ├── transcribe/route.ts     # Fallback Whisper
│       └── public-stats/route.ts   # Compteur de comptes (landing)
├── components/                     # ui.tsx (shadcn-style), landing, session-room, …
├── lib/
│   ├── ai.ts                       # Prompts système (génération/évaluation) + fallbacks
│   ├── sm2.ts                      # Répétition espacée simplifiée
│   ├── limits.ts                   # Limites freemium appliquées côté serveur
│   ├── auth.ts                     # Sessions, hachage scrypt, getCurrentUser
│   ├── extract.ts                  # Extraction PDF/DOCX/PPTX côté navigateur
│   └── i18n*.ts(x)                 # Dictionnaires FR/EN + provider
└── db/schema.ts                    # users, auth_sessions, subscriptions, courses,
                                  # chapters, questions, flashcards, oral_sessions,
                                  # answers, question_progress
```

## Schéma SQL (résumé)

```sql
users(id uuid pk, email unique, name, password_hash, locale, created_at)
auth_sessions(id, token unique, user_id fk, expires_at)
subscriptions(id, user_id unique, plan 'free'|'premium', status,
              stripe_customer_id, stripe_subscription_id, current_period_end)
courses(id, user_id fk, title, source_name, raw_text, status, created_at)
chapters(id, course_id fk, "order", title, summary, key_concepts jsonb)
questions(id, course_id fk, chapter_id fk, type, difficulty 1-5,
          prompt, model_answer, key_points jsonb)
flashcards(id, course_id fk, chapter_id fk, front, back)
oral_sessions(id, user_id fk, course_id fk, mode 'practice'|'exam',
              started_at, ended_at, answered_count, avg_score)
answers(id, oral_session_id fk, question_id fk, transcript,
        score 0-100, verdict 'correct|partiel|faux', feedback, missing_points jsonb)
question_progress(id, user_id fk, question_id fk, easiness real, interval_days,
                  repetitions, lapses, last_score, next_due_at,
                  unique(user_id, question_id))   -- SM-2
```

Le schéma est appliqué avec `npx drizzle-kit push` (fichier source : `src/db/schema.ts`).

## Logique IA (prompts système)

- **Structuration** (`structureCourse`) : découpe le cours brut en 3-8 chapitres, extrait les
  concepts clés, génère 2-4 questions variées par chapitre (définition / application /
  explication, difficulté 1→5) + flashcards. Réponse JSON stricte, basée **uniquement** sur
  le texte du cours.
- **Évaluation** (`evaluateAnswer`) : compare la transcription orale à la réponse modèle +
  points clés, renvoie `{score 0-100, verdict, feedback ≤60 mots, missing[]}`, encourageant,
  tolérant au bruit STT.
- **Mode examen** : 10 questions sans aucune aide ni feedback, note finale sur 20.
- **Coûts maîtrisés** : texte plafonné à 30 000 caractères/appel, questions bornées, limites
  freemium vérifiées côté serveur (1 cours, 3 sessions/semaine).

## Démarrage local

```bash
cp .env.example .env          # remplissez DATABASE_URL (+ ANTHROPIC_API_KEY, Stripe…)
npm install
npx drizzle-kit push          # crée les tables
npm run dev
```

Sans `ANTHROPIC_API_KEY`, un moteur heuristique local assure une démo complète.
Le mode Premium de démonstration doit être activé explicitement avec `ALLOW_DEMO_PREMIUM=true` et reste interdit en production.

### Emails en bêta sans domaine

Voxa accepte deux modes temporaires :

1. sans fournisseur email, l'inscription reste disponible mais la vérification et la récupération par email ne peuvent pas aboutir ;
2. avec Brevo, configurez `BREVO_API_KEY` et une adresse `EMAIL_FROM` vérifiée dans Brevo. Cela permet d'envoyer aux vrais utilisateurs avant l'achat d'un domaine.

Resend reste pris en charge avec `RESEND_API_KEY` et devient prioritaire si les deux fournisseurs sont configurés. Pour une commercialisation durable, remplacez l'adresse personnelle par un domaine d'envoi authentifié.

## Déploiement sur Vercel

1. Poussez le repo sur GitHub puis **Import** dans Vercel (framework Next.js détecté).
2. Variables d'environnement (Project → Settings → Environment Variables) : tout `.env.example`.
3. Base de données : créez un projet **Supabase**, copiez la chaîne de connexion dans
   `DATABASE_URL`, puis `npx drizzle-kit push` (ou Vercel Postgres / Neon).
4. Stripe : créez un prix récurrent 7,99 € → `STRIPE_PRICE_ID` ; webhook
   `https://<votre-domaine>/api/stripe/webhook` (événements `checkout.session.completed`,
   `customer.subscription.deleted`) → `STRIPE_WEBHOOK_SECRET`.
5. Google OAuth (optionnel) : implémentez le callback dans `/api/auth/google`
   (ou activez le provider Google de Supabase Auth et remplacez `src/lib/auth.ts`).

## Routes principales

`/` landing · `/login` · `/dashboard` · `/courses/new` · `/courses/[id]` ·
`/session/[courseId]?mode=exam` · `/flashcards/[courseId]` · `/lacunes` · `/pricing`
