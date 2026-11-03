CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oral_session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"transcript" text DEFAULT '' NOT NULL,
	"response_mode" text DEFAULT 'oral' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"verdict" text DEFAULT 'faux' NOT NULL,
	"feedback" text DEFAULT '' NOT NULL,
	"missing_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_tickets" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"key_concepts" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"source_name" text,
	"raw_text" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oral_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"mode" text DEFAULT 'practice' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"answered_count" integer DEFAULT 0 NOT NULL,
	"avg_score" integer
);
--> statement-breakpoint
CREATE TABLE "question_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"easiness" real DEFAULT 2.5 NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_score" integer,
	"next_due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"type" text DEFAULT 'definition' NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"prompt" text NOT NULL,
	"model_answer" text DEFAULT '' NOT NULL,
	"key_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"image_url" text,
	"locale" text DEFAULT 'fr' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_oral_session_id_oral_sessions_id_fk" FOREIGN KEY ("oral_session_id") REFERENCES "public"."oral_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tickets" ADD CONSTRAINT "auth_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oral_sessions" ADD CONSTRAINT "oral_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oral_sessions" ADD CONSTRAINT "oral_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_progress" ADD CONSTRAINT "question_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_progress" ADD CONSTRAINT "question_progress_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answers_session_idx" ON "answers" USING btree ("oral_session_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_tickets_user_idx" ON "auth_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chapters_course_idx" ON "chapters" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "courses_user_idx" ON "courses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "flashcards_course_idx" ON "flashcards" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "oral_sessions_user_idx" ON "oral_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oral_sessions_course_idx" ON "oral_sessions" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_progress_user_question_uniq" ON "question_progress" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "question_progress_user_idx" ON "question_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "questions_course_idx" ON "questions" USING btree ("course_id");