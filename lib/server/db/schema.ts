import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Feedback } from "../../analysis";
import { GRADES } from "../../grades";
import { user } from "./auth-schema";

// Better Auth's tables (user, session, account, verification, rate_limit).
export * from "./auth-schema";

/** Postgres bytea. node-postgres returns a Buffer and PGlite a Uint8Array; both are Uint8Arrays. */
const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

/**
 * pending:    created; the browser is uploading, or a run hit a busy model and can be retried
 * processing: claimed by a run request (claims expire, so a crashed run can be retried)
 * complete:   analyzed and saved
 * failed:     can't be analyzed (unreadable video, too long, ...); doesn't count toward quotas
 */
export const analysisStatus = pgEnum("analysis_status", ["pending", "processing", "complete", "failed"]);
export const gradeEnum = pgEnum("grade", GRADES);

export const analysis = pgTable(
  "analysis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: analysisStatus("status").notNull().default("pending"),
    /** The uploaded video in the Gemini Files API, e.g. `files/<id>`. Deleted after analysis. */
    geminiFile: text("gemini_file").notNull(),
    videoName: text("video_name").notNull(),
    videoBytes: integer("video_bytes").notNull(),
    videoSeconds: real("video_seconds"),
    /** Optional note from the lifter, e.g. "last set felt heavy on my lower back". */
    notes: text("notes"),
    thumbnail: bytea("thumbnail"),

    // Set when the analysis completes.
    isExercise: boolean("is_exercise"),
    exercise: text("exercise"),
    /** A key from lib/exercises.ts or `custom:<slug>`; used to track progress per lift. */
    exerciseKey: text("exercise_key"),
    grade: gradeEnum("grade"),
    feedback: jsonb("feedback").$type<Feedback>(),
    model: text("model"),
    error: text("error"),

    /** Unguessable token for the public share link; null when not shared. */
    shareToken: text("share_token").unique(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    // History, dashboards and the per-user daily quota.
    index("analysis_user_created_idx").on(t.userId, t.createdAt.desc()),
    // Progress per exercise and "compared to last time".
    index("analysis_user_exercise_idx")
      .on(t.userId, t.exerciseKey, t.createdAt.desc())
      .where(sql`${t.status} = 'complete'`),
    // The global daily cap counts recent rows across all users.
    index("analysis_created_idx").on(t.createdAt),
  ],
);

export type AnalysisRow = typeof analysis.$inferSelect;
