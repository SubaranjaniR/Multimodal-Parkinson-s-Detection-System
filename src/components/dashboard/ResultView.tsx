import type { FinalPrediction } from "@/lib/api";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ResultView({ result }: { result: FinalPrediction }) {
  const risk = result.riskPercent;
  const level = risk < 35 ? "Low" : risk < 65 ? "Moderate" : "High";
  const color = risk < 35 ? "#14B8A6" : risk < 65 ? "#0EA5E9" : "#EF4444";

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <CircularProgress value={risk} color={color} />
          <div className="mt-4 text-sm uppercase tracking-widest text-muted-foreground">Parkinson Risk</div>
          <div className="mt-1 text-2xl font-bold" style={{ color }}>{level} Risk</div>
        </div>
        <div className="glass rounded-2xl p-8">
          <h3 className="font-display text-xl font-semibold">Modality Scores</h3>
          <div className="mt-6 space-y-5">
            <ScoreBar label="Symptoms" value={result.symptomsScore} />
            <ScoreBar label="Voice" value={result.voiceScore} />
            <ScoreBar label="Handwriting" value={result.handwritingScore} />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 sm:p-8">
        <h3 className="font-display text-xl font-semibold">Explainable AI — Feature Importance</h3>
        <p className="text-sm text-muted-foreground mt-1">SHAP-style contribution of each feature to the prediction.</p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={result.featureImportance} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis type="category" dataKey="feature" stroke="var(--muted-foreground)" fontSize={12} width={140} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Bar dataKey="value" fill="url(#brand)" radius={[0, 8, 8, 0]} />
              <defs>
                <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 grid sm:grid-cols-3 gap-3">
          {result.featureImportance.slice(0, 3).map((f) => (
            <div key={f.feature} className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs uppercase text-muted-foreground">Top Driver</div>
              <div className="mt-1 font-semibold">{f.feature}</div>
              <div className="text-xs text-muted-foreground mt-1">Contribution {f.value.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CircularProgress({ value, color }: { value: number; color: string }) {
  const r = 80;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={200} height={200} viewBox="0 0 200 200" className="-rotate-90">
      <circle cx={100} cy={100} r={r} stroke="var(--border)" strokeWidth={14} fill="none" />
      <circle cx={100} cy={100} r={r} stroke={color} strokeWidth={14} fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x="100" y="100" textAnchor="middle" dominantBaseline="central"
        transform="rotate(90 100 100)" fontSize="42" fontWeight="700" fill="var(--foreground)">
        {value}%
      </text>
    </svg>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm font-medium">
        <span>{label}</span><span className="font-mono text-primary">{value}/100</span>
      </div>
      <div className="mt-2 h-3 rounded-full bg-muted overflow-hidden">
        <div className="h-full gradient-brand transition-all duration-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
