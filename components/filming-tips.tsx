import { Camera, Clock3, Maximize } from "lucide-react";

const TIPS = [
  { Icon: Camera, text: "Film from the side or at a 45° angle, about hip height." },
  { Icon: Maximize, text: "Keep your whole body, and the bar, in frame the entire time." },
  { Icon: Clock3, text: "Record a single set, trimmed to the reps you want reviewed." },
];

export function FilmingTips() {
  return (
    <section className="rounded-2xl border border-white/10 p-5 sm:p-6">
      <h2 className="font-semibold text-white">For the most accurate feedback</h2>
      <ul className="mt-4 space-y-3">
        {TIPS.map(({ Icon, text }) => (
          <li key={text} className="flex gap-3 text-slate-300">
            <Icon className="mt-0.5 size-5 shrink-0 text-blue-300" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
