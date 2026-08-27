import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Brain, FileText, Mic, PenTool, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import heroBrain from "@/assets/hero-brain.jpg";
import doctorAi from "@/assets/doctor-ai.jpg";
import voiceImg from "@/assets/voice-analysis.jpg";
import handImg from "@/assets/handwriting.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuroPark AI — Detect Parkinson's Early with AI" },
      { name: "description", content: "Multimodal AI system for early Parkinson's prediction using symptoms, voice analysis and handwriting analysis." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-aurora">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-[fade-in_0.6s_ease-out]">
            <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Research-grade Multimodal AI
            </span>
            <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
              Detect <span className="gradient-text">Parkinson's Disease</span> Early with AI
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Multimodal AI system using Symptoms, Voice Analysis, Handwriting Analysis, and MRI Brain Scans — combined in a single explainable prediction.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/predict" className="inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-white font-semibold shadow-xl shadow-primary/30 hover:-translate-y-0.5 transition-all">
                <Activity className="h-4 w-4" /> Start Prediction
              </Link>
              <Link to="/about" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/70 backdrop-blur px-6 py-3 font-semibold hover:bg-card">
                Learn More
              </Link>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { k: "95%", v: "Model Accuracy" },
                { k: "4", v: "Modalities" },
                { k: "<2s", v: "Inference" },
              ].map((s) => (
                <div key={s.v} className="glass rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold gradient-text">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <div className="absolute -inset-8 gradient-brand opacity-20 blur-3xl rounded-full" />
            <img
              src={heroBrain}
              alt="3D illustration of a brain with neural pathways"
              width={1536} height={1024}
              className="relative rounded-3xl shadow-2xl animate-float"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <SectionHeader eyebrow="Workflow" title="How It Works" subtitle="Four signals, one explainable prediction." />
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Stethoscope, title: "1. Symptom Profile", desc: "Answer a brief clinical questionnaire — tremor, rigidity, bradykinesia and more." },
            { icon: Mic, title: "2. Voice Analysis", desc: "Upload a short voice sample. We analyse jitter, shimmer and tonal stability." },
            { icon: PenTool, title: "3. Handwriting Scan", desc: "Upload an image of your handwriting — we measure tremor signatures and micrographia." },
            { icon: Brain, title: "4. MRI Scan", desc: "Upload a brain MRI scan — deep neural networks analyze neural structures with Grad-CAM heatmaps." },
          ].map((s, i) => (
            <div key={s.title} className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 grid place-items-center rounded-xl gradient-brand text-white shadow-lg shadow-primary/20">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
              <div className="mt-6 text-xs font-mono text-primary font-bold">STEP 0{i + 1}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Features with image */}
      <section className="bg-aurora">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <img src={doctorAi} alt="Neurologist using AI brain scan interface" width={1280} height={896} loading="lazy" className="rounded-3xl shadow-2xl" />
          <div>
            <SectionHeader align="left" eyebrow="AI Features" title="Designed with neurologists in mind" />
            <ul className="mt-6 space-y-4">
              {[
                { icon: Brain, t: "Multimodal Fusion", d: "Combines tabular, audio and visual signals into a single risk score." },
                { icon: ShieldCheck, t: "Explainable AI", d: "SHAP-based feature importance for every prediction." },
                { icon: FileText, t: "Downloadable Report", d: "Generate a clean clinical-style PDF report on demand." },
              ].map((f) => (
                <li key={f.t} className="flex gap-4 glass rounded-xl p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg gradient-brand text-white">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-semibold">{f.t}</div>
                    <p className="text-sm text-muted-foreground">{f.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Benefits cards w/ imagery */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <SectionHeader eyebrow="Benefits" title="Why early detection matters" subtitle="Catching Parkinson's signs early can extend independent living and improve quality of life." />
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform">
            <img src={voiceImg} alt="Voice waveform analysis" width={1024} height={768} loading="lazy" className="h-56 w-full object-cover" />
            <div className="p-6">
              <h3 className="font-display text-xl font-semibold">Voice biomarkers</h3>
              <p className="mt-2 text-sm text-muted-foreground">Subtle vocal tremors can appear years before motor symptoms.</p>
            </div>
          </div>
          <div className="glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform">
            <img src={handImg} alt="Handwriting analysis" width={1024} height={768} loading="lazy" className="h-56 w-full object-cover" />
            <div className="p-6">
              <h3 className="font-display text-xl font-semibold">Handwriting signatures</h3>
              <p className="mt-2 text-sm text-muted-foreground">Micrographia and pen-pressure variations are quantifiable markers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Research */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="glass rounded-3xl p-8 lg:p-12 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div>
            <SectionHeader align="left" eyebrow="Research-based" title="Built on peer-reviewed methods" />
            <p className="mt-4 text-muted-foreground">
              NeuroPark AI implements techniques from published Parkinson's research — including the UCI Parkinson Voice dataset,
              spiral and meander handwriting analysis, and validated clinical questionnaires.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["UCI Voice", "MDS-UPDRS", "Spiral Drawing", "SHAP XAI", "PPMI cohort"].map((t) => (
                <span key={t} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">{t}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-primary/30 p-6 bg-primary/5">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Medical Disclaimer</div>
            <p className="mt-2 text-sm text-muted-foreground">
              NeuroPark AI is an educational research tool. It does not provide a medical diagnosis.
              Always consult a qualified neurologist for clinical decisions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle, align = "center" }:
  { eyebrow?: string; title: string; subtitle?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>}
      <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
