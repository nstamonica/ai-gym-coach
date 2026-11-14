import { Play } from "lucide-react";

// Side view of the bottom of a squat, with the joint tracking and bar path the
// coach reasons about. Illustration for the landing page sample.
const JOINTS: [number, number][] = [
  [302, 70], // head
  [256, 120], // shoulder
  [196, 184], // hip
  [294, 194], // knee
  [252, 242], // ankle
];

export function SampleFrame() {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
      <svg viewBox="0 0 480 270" className="absolute inset-0 size-full" aria-hidden>
        <rect y="246" width="480" height="24" fill="#1e293b" />
        {/* squat rack in the background */}
        <rect x="392" y="40" width="8" height="206" rx="2" fill="#273449" />
        <rect x="436" y="40" width="8" height="206" rx="2" fill="#273449" />

        {/* lifter */}
        <g stroke="#cbd5e1" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M252 242 L294 194 L196 184 L256 120" strokeWidth="16" />
          <path d="M236 246 L286 246" strokeWidth="10" />
        </g>
        <path d="M256 120 L294 80" stroke="#cbd5e1" strokeWidth="12" strokeLinecap="round" />
        <circle cx="302" cy="70" r="17" fill="#cbd5e1" />

        {/* bar path: straight up and down over mid-foot */}
        <path d="M258 36 L258 240" stroke="#10b981" strokeWidth="2" strokeDasharray="5 5" opacity="0.9" />

        {/* plate, seen end-on */}
        <circle cx="258" cy="112" r="36" fill="#475569" stroke="#0f172a" strokeWidth="3" />
        <circle cx="258" cy="112" r="24" fill="none" stroke="#64748b" strokeWidth="2" />
        <circle cx="258" cy="112" r="5" fill="#cbd5e1" />

        {/* joint tracking */}
        <polyline points={JOINTS.map((j) => j.join(",")).join(" ")} fill="none" stroke="#3987e5" strokeWidth="2" />
        {JOINTS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#3987e5" stroke="#0f172a" strokeWidth="2" />
        ))}

        <rect x="268" y="26" width="124" height="22" rx="11" fill="#022c22" opacity="0.85" />
        <text x="330" y="41" textAnchor="middle" fill="#6ee7b7" fontSize="12" fontFamily="ui-sans-serif, system-ui">
          bar over mid-foot
        </text>
      </svg>
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        <Play className="size-3.5 fill-current" aria-hidden />
        0:14
      </div>
    </div>
  );
}
