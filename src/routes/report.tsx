import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { api, type FinalPrediction, type SymptomsInput } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "AI Report — NeuroPark AI" },
      { name: "description", content: "Generate a downloadable AI report summarising your Parkinson's risk assessment." },
    ],
  }),
  component: Report,
});

interface Stored { symptoms: SymptomsInput; result: FinalPrediction; }

function Report() {
  const [data, setData] = useState<Stored | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("np-result");
      if (raw) setData(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  const download = async () => {
    if (!data) return;
    const toastId = toast.loading("Generating clinical PDF report...");
    try {
      const response = await api.downloadReport(data);
      if (!response.ok) throw new Error("Failed to download PDF report");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neuropark-report-${Date.now()}.pdf`;
      a.click();
      
      toast.dismiss(toastId);
      toast.success("PDF report downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF. Falling back to browser print.");
      
      // Fallback local print
      const html = buildReportHTML(data);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) {
        w.addEventListener("load", () => setTimeout(() => w.print(), 400));
      } else {
        const a = document.createElement("a");
        a.href = url; a.download = "neuropark-report.html"; a.click();
      }
    }
  };

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <FileText className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-bold">No report yet</h1>
        <p className="mt-2 text-muted-foreground">Run a prediction first to generate your personalised AI report.</p>
        <Link to="/predict" className="mt-6 inline-flex rounded-xl gradient-brand text-white px-6 py-3 font-semibold">Start Prediction</Link>
      </div>
    );
  }

  const { symptoms, result } = data;

  return (
    <div className="bg-aurora min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">AI Report</div>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold">Patient Assessment Summary</h1>
          </div>
          <button onClick={download} className="inline-flex items-center gap-2 rounded-xl gradient-brand text-white px-5 py-2.5 font-semibold shadow-lg shadow-primary/30">
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </header>

        <div className="mt-8 glass rounded-2xl p-8 space-y-8">
          <Section title="Patient Summary">
            <Grid items={[
              ["Age", symptoms.age],
              ["Gender", symptoms.gender],
              ["Family History", symptoms.familyHistory ? "Yes" : "No"],
              ["Report ID", `NPK-${Date.now().toString(36).toUpperCase()}`],
            ]} />
          </Section>
          <Section title="Prediction Results">
            <Grid items={[
              ["Overall Risk", `${result.riskPercent}%`],
              ["Symptoms Score", `${result.symptomsScore}/100`],
              ["Voice Score", `${result.voiceScore}/100`],
              ["Handwriting Score", `${result.handwritingScore}/100`],
            ]} />
          </Section>
          <Section title="Risk Analysis">
            <ul className="space-y-2 text-sm">
              {result.featureImportance.slice(0, 5).map((f) => (
                <li key={f.feature} className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">{f.feature}</span>
                  <span className="font-mono">{f.value.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Recommendations">
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Consult a board-certified neurologist for confirmatory evaluation.</li>
              <li>Schedule a clinical motor exam (MDS-UPDRS).</li>
              <li>Repeat this AI assessment every 3-6 months to monitor change.</li>
            </ul>
          </Section>
          <Section title="Lifestyle Suggestions">
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>30 minutes of aerobic exercise, 5 days a week.</li>
              <li>Balance and posture training (tai chi, yoga).</li>
              <li>Speech exercises if voice score is elevated.</li>
              <li>Quality sleep and a Mediterranean-style diet.</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold border-b border-border pb-2">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Grid({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid sm:grid-cols-2 gap-4">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-border bg-card p-4">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
          <dd className="mt-1 font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function buildReportHTML({ symptoms, result }: Stored): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>NeuroPark AI Report</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:800px;margin:40px auto;padding:0 24px}
  h1{color:#2563EB;margin:0 0 4px}
  h2{border-bottom:2px solid #2563EB;padding-bottom:6px;margin-top:30px;color:#0f172a}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .card{border:1px solid #e2e8f0;padding:12px;border-radius:8px}
  .label{font-size:11px;text-transform:uppercase;color:#64748b}
  .value{font-weight:600;margin-top:4px}
  .risk{font-size:48px;font-weight:700;color:#2563EB}
</style></head><body>
<h1>NeuroPark AI — Assessment Report</h1>
<div style="color:#64748b">Generated ${new Date().toLocaleString()}</div>
<h2>Overall Risk</h2><div class="risk">${result.riskPercent}%</div>
<h2>Patient Summary</h2>
<div class="grid">
  <div class="card"><div class="label">Age</div><div class="value">${symptoms.age}</div></div>
  <div class="card"><div class="label">Gender</div><div class="value">${symptoms.gender}</div></div>
  <div class="card"><div class="label">Family History</div><div class="value">${symptoms.familyHistory ? "Yes" : "No"}</div></div>
</div>
<h2>Modality Scores</h2>
<div class="grid">
  <div class="card"><div class="label">Symptoms</div><div class="value">${result.symptomsScore}/100</div></div>
  <div class="card"><div class="label">Voice</div><div class="value">${result.voiceScore}/100</div></div>
  <div class="card"><div class="label">Handwriting</div><div class="value">${result.handwritingScore}/100</div></div>
</div>
<h2>Top Risk Drivers</h2>
<ol>${result.featureImportance.slice(0, 5).map(f => `<li>${f.feature} — ${f.value.toFixed(1)}</li>`).join("")}</ol>
<h2>Recommendations</h2>
<ul><li>Consult a neurologist for clinical evaluation.</li><li>Repeat assessment every 3-6 months.</li><li>Regular aerobic exercise & balance training.</li></ul>
<p style="margin-top:40px;font-size:11px;color:#64748b">This report is for educational purposes only and is not a medical diagnosis.</p>
</body></html>`;
}
