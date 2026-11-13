# AI Gym Coach

Upload a short video of your lift and get an instant form review: the exercise, a grade from A to F, what you're doing well, the three corrections that matter most, and any safety warnings. Powered by Google Gemini's video understanding.

Built with Next.js (App Router), React, Tailwind CSS and the Gemini API.

## How it works

```
Browser ──(1) size + type──▶ /api/upload ──▶ Gemini: start a resumable upload
Browser ──(2) video bytes──────────────────▶ Gemini Files API (direct, one-time URL)
Browser ──(3) file name───▶ /api/analyze ──▶ Gemini: wait for processing → analyze → delete video
```

- **Videos never pass through the server.** The browser uploads straight to Gemini with a one-time URL, so large phone videos work on hosts that cap request size (Vercel allows about 4.5 MB), and your API key never reaches the browser.
- **Structured output.** Gemini returns JSON that matches a schema ([lib/analysis.ts](lib/analysis.ts)), so there's no fragile text parsing.
- **Model fallback.** If a model is overloaded, out of quota or retired, the next one in the list is tried ([lib/server/gemini.ts](lib/server/gemini.ts)).
- **Videos are deleted from Gemini** as soon as the analysis finishes, whether it succeeded or not.

## Run it locally

You need [Node.js](https://nodejs.org) 20.9 or newer and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env.local   # then paste your key into .env.local
npm run dev
```

Open http://localhost:3000.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Your Gemini API key. Server-side only. |
| `GEMINI_MODEL` | No | Comma-separated models to try in order. Defaults to `gemini-2.5-flash,gemini-3-flash-preview,gemini-3.5-flash,gemini-flash-latest`. |

Upload limits (100 MB, 90 seconds) are in [lib/config.ts](lib/config.ts). The coaching prompt and grading scale are in [lib/analysis.ts](lib/analysis.ts).

## Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repository. Vercel detects Next.js automatically.
2. Under **Environment Variables**, add `GEMINI_API_KEY`.
3. Click **Deploy**. Every push to `main` redeploys automatically.

The analyze route sets `maxDuration = 300` seconds, which needs Vercel's Fluid Compute (on by default for new projects). If a deploy complains about the duration, enable Fluid Compute under **Settings → Functions**, or lower `maxDuration` in [app/api/analyze/route.ts](app/api/analyze/route.ts).

## Before you share it publicly

Anyone who can open the site can spend your Gemini quota.

- **Rate limiting:** each IP address gets 10 analyses per hour. This is in-memory and best-effort, because serverless instances don't share counts. For hard limits, use a shared store such as Upstash Redis.
- **Cap your key.** In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), restrict the key to the *Generative Language API* and lower its requests-per-day quota. If billing is enabled, add a budget alert.
- **Privacy:** on Gemini's free tier, Google may use submitted content, including your users' videos, to improve its products. If you have real users, enable billing on the key's Google Cloud project (paid-tier content isn't used that way) and tell users how their videos are handled.

## Limitations

AI form feedback can be wrong. Grades can vary between runs and models, especially with poor camera angles. It isn't a substitute for a qualified coach or medical advice.

## Project structure

```
app/
  page.tsx              Upload UI and progress states
  result-card.tsx       Analysis results
  api/upload/route.ts   Validates the file and creates a one-time upload URL
  api/analyze/route.ts  Waits for processing, analyzes, deletes the video
lib/
  config.ts             Upload limits and supported formats (shared)
  analysis.ts           Prompt, JSON schema and result type (shared)
  server/gemini.ts      Gemini client and upload session (server-only)
  server/rate-limit.ts  Per-IP rate limiter
```
