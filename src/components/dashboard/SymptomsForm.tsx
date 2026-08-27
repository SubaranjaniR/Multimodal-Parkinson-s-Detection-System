import type { SymptomsInput } from "@/lib/api";

const sliders: { key: keyof SymptomsInput; label: string; help: string }[] = [
  { key: "tremor", label: "Tremor", help: "Involuntary shaking" },
  { key: "rigidity", label: "Rigidity", help: "Muscle stiffness" },
  { key: "bradykinesia", label: "Bradykinesia", help: "Slowness of movement" },
  { key: "posturalInstability", label: "Postural Instability", help: "Balance issues" },
  { key: "speechProblems", label: "Speech Problems", help: "Soft / slurred speech" },
  { key: "sleepDisorders", label: "Sleep Disorders", help: "REM behavior issues" },
];

export function SymptomsForm({ value, onChange, onNext }: {
  value: SymptomsInput;
  onChange: (v: SymptomsInput) => void;
  onNext: () => void;
}) {
  const update = <K extends keyof SymptomsInput>(k: K, val: SymptomsInput[K]) => {
    onChange({ ...value, [k]: val });
  };

  return (
    <div className="glass rounded-2xl p-6 sm:p-8">
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Age">
          <input 
            type="number" 
            min={1} 
            max={120} 
            value={value.age === 0 ? "" : value.age}
            onChange={(e) => {
              const val = e.target.value;
              update("age", val === "" ? 0 : Number(val));
            }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" 
          />
        </Field>
        <Field label="Gender">
          <select 
            value={value.gender} 
            onChange={(e) => update("gender", e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Family History">
          <label className="flex items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={value.familyHistory}
              onChange={(e) => update("familyHistory", e.target.checked)} 
            />
            <span>Relative diagnosed with Parkinson's</span>
          </label>
        </Field>
      </div>



      <div className="mt-6 grid sm:grid-cols-2 gap-5">
        {sliders.map((s) => (
          <div key={s.key} className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.help}</div>
              </div>
              <span className="font-mono text-primary text-lg">{(value[s.key] as number)}/10</span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={10} 
              step={1} 
              value={value[s.key] as number}
              onChange={(e) => update(s.key, Number(e.target.value) as never)}
              className="mt-3 w-full accent-primary" 
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button 
          onClick={onNext} 
          className="rounded-xl gradient-brand text-white px-6 py-3 font-semibold shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
        >
          Continue → Voice
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
