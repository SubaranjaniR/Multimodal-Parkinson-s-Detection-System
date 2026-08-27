import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Brain, HeartPulse, Stethoscope } from "lucide-react";
import heroBrain from "@/assets/hero-brain.jpg";
import patient from "@/assets/patient.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Parkinson's Disease — NeuroPark AI" },
      { name: "description", content: "Learn what Parkinson's Disease is, its symptoms, causes, and why early detection matters." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div>
      <section className="bg-aurora">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">About</div>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl font-bold leading-tight">
              Understanding <span className="gradient-text">Parkinson's Disease</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              A progressive neurological disorder affecting movement, balance, voice and fine motor skills.
              Early detection helps slow progression and improves quality of life.
            </p>
          </div>
          <img src={heroBrain} alt="Brain illustration" width={1536} height={1024} loading="lazy" className="rounded-3xl shadow-2xl" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-6">
        {[
          {
            icon: Brain, title: "What is Parkinson's?",
            text: "A neurodegenerative disease caused by the loss of dopamine-producing neurons in the substantia nigra region of the brain."
          },
          {
            icon: Stethoscope, title: "Common Symptoms",
            text: "Tremor at rest, muscle rigidity, slowness of movement (bradykinesia), postural instability, soft speech, and handwriting changes (micrographia)."
          },
          {
            icon: AlertCircle, title: "Possible Causes",
            text: "A combination of genetic factors, age, environmental toxins, and head trauma. Family history may increase risk."
          },
          {
            icon: HeartPulse, title: "Why Early Detection Matters",
            text: "Treatment is most effective in early stages. Multimodal AI screening can flag subtle biomarkers years before clinical diagnosis."
          },
        ].map((c) => (
          <div key={c.title} className="glass rounded-2xl p-6 hover:-translate-y-1 transition-transform">
            <div className="h-12 w-12 grid place-items-center rounded-xl gradient-brand text-white">
              <c.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">{c.title}</h3>
            <p className="mt-2 text-muted-foreground">{c.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20 grid lg:grid-cols-2 gap-10 items-center">
        <img src={patient} alt="Doctor with elderly patient" width={1024} height={768} loading="lazy" className="rounded-3xl shadow-2xl" />
        <div>
          <h2 className="font-display text-3xl font-bold">Living well with proactive care</h2>
          <p className="mt-3 text-muted-foreground">
            Combined with regular check-ups, exercise, and proper medication, early intervention helps people maintain
            independence and well-being for much longer.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Regular aerobic exercise improves motor symptoms",
              "Speech therapy maintains vocal strength",
              "Occupational therapy supports fine motor skills",
              "Mindfulness and sleep hygiene reduce non-motor symptoms",
            ].map((t) => (
              <li key={t} className="flex gap-3"><span className="mt-1 h-2 w-2 rounded-full gradient-brand" />{t}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
