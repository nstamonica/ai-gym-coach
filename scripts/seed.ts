// Seeds a demo account with eight weeks of form checks, so the dashboard and
// history have something to show without spending any Gemini quota.
//
//   npm run db:seed
//
// With the embedded database (no DATABASE_URL), stop `npm run dev` first: only
// one process can open it at a time. Re-running replaces the demo account.
// `--fresh` deletes the embedded database first (used by the end-to-end tests).
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { loadEnvConfig } from "@next/env";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import type { Feedback } from "../lib/analysis";
import type { Grade } from "../lib/grades";
import * as schema from "../lib/server/db/schema";

loadEnvConfig(process.cwd());

const DEMO_ACCOUNT = { name: "Alex Rivera", email: "demo@example.com", password: "demo-lifter-2026" };

interface Session {
  daysAgo: number;
  key: string;
  exercise: string;
  grade: Grade;
  summary: string;
  tips: [title: string, detail: string][];
  strengths: string[];
  safetyWarning?: string;
  progressNote?: string;
  cameraTip?: string;
}

const SESSIONS: Session[] = [
  {
    daysAgo: 54,
    key: "back_squat",
    exercise: "Barbell back squat",
    grade: "C",
    summary: "A decent effort, but your depth is inconsistent and your chest drops forward as you come out of the bottom.",
    tips: [
      ["Keep your chest proud", "Your torso folds forward at 0:06. Brace hard and think “chest up” through the whole rep."],
      ["Sit down between your heels", "Push your knees out as you descend so you can reach parallel without your heels lifting."],
      ["Slow the descent", "You drop fast and bounce out of the bottom. Take about two seconds on the way down."],
    ],
    strengths: ["Feet are set at a good width", "The bar sits in a stable position on your upper back"],
    cameraTip: "Film from the side at hip height so your depth is easier to judge.",
  },
  {
    daysAgo: 50,
    key: "deadlift",
    exercise: "Conventional deadlift",
    grade: "D",
    summary: "The bar drifts away from your legs and your back rounds as it leaves the floor, which puts a lot of stress on your spine.",
    safetyWarning: "Your lower back rounds off the floor on every rep. Lower the weight until you can keep a neutral spine.",
    tips: [
      ["Keep the bar against your shins", "Set up with the bar over mid-foot and drag it up your legs the whole way."],
      ["Pull the slack out first", "Before the bar leaves the floor, pull up until it clicks against the plates and your back tightens."],
      ["Hinge, don't squat", "Your hips start too low. Push them back until your shoulders are just in front of the bar."],
    ],
    strengths: ["Strong lockout with your hips fully extended"],
  },
  {
    daysAgo: 44,
    key: "back_squat",
    exercise: "Barbell back squat",
    grade: "C",
    summary: "Your descent is much more controlled, but your chest still drops out of the bottom on the last reps.",
    progressNote: "Your tempo on the way down is slower and steadier than last time. Your chest still drops forward out of the hole.",
    tips: [
      ["Brace before every rep", "Take a big breath into your belly at the top and hold it until you stand back up."],
      ["Lead with your chest", "From 0:11 your hips rise first. Drive your upper back into the bar as you leave the bottom."],
      ["Push your knees out", "Your knees drift in slightly on the way up. Spread the floor with your feet."],
    ],
    strengths: ["Controlled two-second descent", "Hitting parallel on most reps"],
  },
  {
    daysAgo: 40,
    key: "bench_press",
    exercise: "Barbell bench press",
    grade: "B",
    summary: "Good control and a consistent bar path. Your elbows flare wide at the bottom, which stresses your shoulders.",
    tips: [
      ["Tuck your elbows", "Bring your elbows to about 45° from your body so the bar touches just below your chest."],
      ["Keep your feet planted", "Your heels lift on the last rep. Drive them into the floor to stay tight."],
      ["Pause on your chest", "Touch and briefly pause instead of bouncing the bar off your chest."],
    ],
    strengths: ["Shoulder blades pinned back throughout", "Smooth, even lockout"],
  },
  {
    daysAgo: 36,
    key: "deadlift",
    exercise: "Conventional deadlift",
    grade: "C",
    summary: "Much better. Your back stays flat off the floor, but the bar still swings forward around your knees.",
    progressNote: "Your back stays neutral off the floor now, which fixes the biggest problem from last time. The bar still drifts forward at the knees.",
    tips: [
      ["Lats tight", "Imagine squeezing oranges in your armpits to keep the bar close as it passes your knees."],
      ["Push the floor away", "Think of leg-pressing the floor rather than lifting the bar with your back."],
      ["Finish with your glutes", "You lean back at lockout. Stand tall and squeeze your glutes instead."],
    ],
    strengths: ["Neutral spine off the floor", "Good starting position"],
  },
  {
    daysAgo: 31,
    key: "back_squat",
    exercise: "Barbell back squat",
    grade: "B",
    summary: "A solid set. You hit parallel on every rep and your torso angle holds much better.",
    progressNote: "Your chest stays up on the first four reps now, so your main fix from last time is working. The last rep still tips forward a little.",
    tips: [
      ["Stay tight on the last rep", "Re-brace before your final rep; that's where your chest drops."],
      ["Knees out on the way up", "Your left knee caves slightly at 0:14. Push it out over your toes."],
      ["Keep the same tempo", "Your last two reps speed up on the way down. Keep every rep the same."],
    ],
    strengths: ["Consistent depth", "Bar stays over mid-foot", "Controlled descent"],
  },
  {
    daysAgo: 28,
    key: "overhead_press",
    exercise: "Standing overhead press",
    grade: "C",
    summary: "You lean back a long way to finish the press, which shifts the load onto your lower back.",
    tips: [
      ["Squeeze your glutes", "Clench your glutes and brace your abs so your ribs stay down as you press."],
      ["Move your head out of the way", "Pull your chin back as the bar passes your face, then push your head through at the top."],
      ["Stack the bar over mid-foot", "At lockout the bar should sit over your shoulders and mid-foot, not in front of you."],
    ],
    strengths: ["Good grip width", "Full lockout overhead"],
  },
  {
    daysAgo: 26,
    key: "bench_press",
    exercise: "Barbell bench press",
    grade: "B",
    summary: "Steady set with better elbow position. Your feet still come up on the hardest rep.",
    progressNote: "Your elbows are tucked much closer than last time. Your heels still lift on the final rep.",
    tips: [
      ["Feet back and planted", "Set your feet slightly behind your knees and keep them pressed down through every rep."],
      ["Squeeze the bar", "A tighter grip will help keep your wrists stacked over your elbows."],
      ["Control the descent", "Lower for a two count so the bar lands in the same place every rep."],
    ],
    strengths: ["Elbows tucked at about 45°", "Consistent touch point"],
  },
  {
    daysAgo: 22,
    key: "deadlift",
    exercise: "Conventional deadlift",
    grade: "B",
    summary: "A strong set. The bar stays close and your back stays flat; your lockout is a little soft.",
    progressNote: "The bar stays close past your knees now, which was the main correction last time.",
    tips: [
      ["Lock out fully", "Finish each rep by squeezing your glutes until your hips are fully through."],
      ["Reset between reps", "You rush the last rep. Take a breath and re-brace at the bottom."],
      ["Same start every rep", "Your hips start a little higher on later reps; set them the same way each time."],
    ],
    strengths: ["Neutral back throughout", "Bar path stays close to your legs"],
  },
  {
    daysAgo: 17,
    key: "back_squat",
    exercise: "Barbell back squat",
    grade: "B",
    summary: "Strong and consistent. Your knees drift inward slightly on the last two reps.",
    progressNote: "Your chest now stays up on every rep, including the last one.",
    tips: [
      ["Push your knees out", "Spread the floor with your feet on the way up to stop the inward drift on reps four and five."],
      ["Keep your breath", "Hold your brace until you're standing, then breathe at the top."],
      ["Own the lockout", "Finish each rep standing fully tall before you start the next."],
    ],
    strengths: ["Chest stays proud through every rep", "Consistent depth", "Smooth tempo"],
  },
  {
    daysAgo: 12,
    key: "bench_press",
    exercise: "Barbell bench press",
    grade: "A",
    summary: "Excellent set. Tight setup, a consistent bar path and a solid leg drive.",
    progressNote: "Your feet stay planted through the whole set now, which fixes the last issue from your previous session.",
    tips: [
      ["Keep it up", "Only refinements left: try a slight pause on your chest to build strength off the bottom."],
      ["Breathe at the top", "Take your breath at lockout rather than mid-press."],
    ],
    strengths: ["Feet planted with strong leg drive", "Elbows tucked", "Same touch point every rep"],
  },
  {
    daysAgo: 8,
    key: "deadlift",
    exercise: "Conventional deadlift",
    grade: "B",
    summary: "Another solid set with a strong lockout. The first rep starts a little jerky.",
    progressNote: "Your lockout is much stronger, with your hips fully through on every rep.",
    tips: [
      ["Take the slack out", "Your first rep jerks off the floor. Pull the slack out before you push."],
      ["Keep your neck neutral", "You look up at the top; keep your gaze a few feet in front of you."],
    ],
    strengths: ["Strong lockout", "Bar stays close", "Neutral spine"],
  },
  {
    daysAgo: 6,
    key: "overhead_press",
    exercise: "Standing overhead press",
    grade: "B",
    summary: "Much better posture. Your ribs stay down and the bar finishes over your head.",
    progressNote: "You barely lean back now, which was the main issue last time.",
    tips: [
      ["Head through at the top", "Push your head forward under the bar at lockout to finish stacked."],
      ["Tighter grip", "Squeeze the bar to keep your forearms vertical."],
    ],
    strengths: ["Ribs down and glutes tight", "Straight bar path"],
  },
  {
    daysAgo: 3,
    key: "back_squat",
    exercise: "High-bar back squat",
    grade: "A",
    summary: "Excellent squat. Depth, bar path and bracing are consistent across the whole set.",
    progressNote: "The knee cave from last time is gone, and the bar stays over mid-foot on every rep.",
    tips: [
      ["Fine-tune your gaze", "Pick a spot on the floor a few feet ahead and keep your eyes there."],
      ["Try a pause squat", "To keep building, add a one-second pause at the bottom on your back-off sets."],
    ],
    strengths: ["Hits depth on every rep", "Chest up and knees tracking over toes", "Steady, controlled tempo"],
  },
];

type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

async function connect(): Promise<{ db: Database; close: () => Promise<void> }> {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return { db: drizzlePostgres(pool, { schema }), close: () => pool.end() };
  }
  const dataDir = process.env.PGLITE_DATA_DIR ?? ".data/pglite";
  if (process.argv.includes("--fresh")) rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(path.dirname(dataDir), { recursive: true }); // a fresh checkout (e.g. CI) has no .data folder yet
  const client = new PGlite(dataDir);
  const local = drizzlePglite(client, { schema });
  await migrate(local, { migrationsFolder: "drizzle" });
  return { db: local, close: () => client.close() };
}

const id = () => crypto.randomUUID().replaceAll("-", "");

async function main() {
  const { db, close } = await connect();
  const now = Date.now();
  const at = (daysAgo: number) => new Date(now - daysAgo * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000);

  // Start fresh: deleting the user cascades to its sessions and analyses.
  await db.delete(schema.user).where(eq(schema.user.email, DEMO_ACCOUNT.email));

  const userId = id();
  const joined = at(60);
  await db.insert(schema.user).values({
    id: userId,
    name: DEMO_ACCOUNT.name,
    email: DEMO_ACCOUNT.email,
    emailVerified: true,
    createdAt: joined,
    updatedAt: joined,
  });
  await db.insert(schema.account).values({
    id: id(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(DEMO_ACCOUNT.password),
    createdAt: joined,
    updatedAt: joined,
  });

  await db.insert(schema.analysis).values(
    SESSIONS.map((s, i) => {
      const analysisId = crypto.randomUUID();
      const feedback: Feedback = {
        summary: s.summary,
        strengths: s.strengths,
        tips: s.tips.map(([title, detail]) => ({ title, detail })),
        safetyWarning: s.safetyWarning ?? "",
        cameraTip: s.cameraTip ?? "",
        progressNote: s.progressNote ?? "",
      };
      return {
        id: analysisId,
        userId,
        status: "complete" as const,
        geminiFile: `files/${analysisId}`,
        videoName: `IMG_${4810 + i * 7}.MOV`,
        videoBytes: 18_000_000 + i * 1_250_000,
        videoSeconds: 18 + ((i * 7) % 20),
        isExercise: true,
        exercise: s.exercise,
        exerciseKey: s.key,
        grade: s.grade,
        feedback,
        model: "gemini-2.5-flash",
        createdAt: at(s.daysAgo),
        completedAt: at(s.daysAgo),
      };
    }),
  );

  console.log(`Seeded ${SESSIONS.length} analyses for ${DEMO_ACCOUNT.email} (password: ${DEMO_ACCOUNT.password}).`);
  await close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
