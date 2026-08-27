import { api } from "@/lib/api";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Loader2, ArrowUp, ArrowDown, MoveRight, SlidersHorizontal, Activity, Mic, PenTool, ClipboardList, Info
} from "lucide-react";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from "recharts";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress & Trends — NeuroPark AI" },
      { name: "description", content: "Analyze health trends, composite risks, and physiological tracking graphs." },
    ],
  }),
  component: Progress,
});

function Progress() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("monthly"); // "weekly" | "monthly" | "yearly"
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("np-token");
    if (!token) {
      router.navigate({ to: "/login" });
      return;
    }
    
    const loadProgress = async () => {
      try {
        const res = await api.getProgress();
        setData(res);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load progress analytics: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadProgress();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-aurora">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading trend analysis...</p>
        </div>
      </div>
    );
  }

  // Filter graph data based on timeframe
  const rawGraphData = data?.graph || [];
  let filteredGraphData = [...rawGraphData];
  if (timeframe === "weekly") {
    filteredGraphData = rawGraphData.slice(-7);
  } else if (timeframe === "monthly") {
    filteredGraphData = rawGraphData.slice(-15); // Show last 15 assessments
  } else {
    filteredGraphData = rawGraphData.slice(-30);
  }

  const comparison = data?.comparison || null;

  const renderDeltaCard = (title: string, icon: React.ReactNode, compItem: any, maxVal = 100) => {
    if (!compItem) return null;
    
    const isImproved = compItem.status === "Improved";
    const isDeclined = compItem.status === "Declined";
    
    let statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    let ArrowIcon = MoveRight;
    
    if (isImproved) {
      statusColor = "text-green-600 bg-green-500/10 border-green-500/20";
      ArrowIcon = ArrowUp;
    } else if (isDeclined) {
      statusColor = "text-red-600 bg-red-500/10 border-red-500/20";
      ArrowIcon = ArrowDown;
    }
    
    return (
      <div className="glass rounded-2xl p-5 border border-border/50 flex flex-col justify-between">
        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
            <div className="text-2xl font-bold mt-2 text-foreground">{Math.round(compItem.current)}/{maxVal}</div>
          </div>
          <div className="h-9 w-9 grid place-items-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>Prev: {Math.round(compItem.prev)}</span>
          </div>
          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}>
            <ArrowIcon className="h-3 w-3" />
            {compItem.status} {compItem.pct > 0 && `(${compItem.pct}%)`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-aurora min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Health Insights</div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Progress Tracking</h1>
            <p className="text-sm text-muted-foreground mt-1">Review comparative reports and wellness trends</p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center bg-card border border-border rounded-xl p-1 gap-1 w-fit flex-shrink-0">
            {["weekly", "monthly", "yearly"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  timeframe === t 
                    ? "gradient-brand text-white shadow" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        {/* Delta comparisons */}
        {comparison ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderDeltaCard("Symptoms Level", <ClipboardList className="h-4.5 w-4.5" />, comparison.symptoms)}
            {renderDeltaCard("Voice Biomarkers", <Mic className="h-4.5 w-4.5" />, comparison.voice)}
            {renderDeltaCard("Handwriting Score", <PenTool className="h-4.5 w-4.5" />, comparison.handwriting)}
            {renderDeltaCard("Composite Risk", <Activity className="h-4.5 w-4.5" />, comparison.risk)}
          </div>
        ) : (
          <div className="glass rounded-2xl p-5 border border-border/50 flex items-center gap-3.5 max-w-2xl">
            <div className="h-10 w-10 flex-shrink-0 grid place-items-center rounded-xl bg-primary/10 text-primary">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Delta comparisons require at least 2 screenings</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Once you complete your next assessment, NeuroPark AI will overlay scores to map improvements.
              </p>
            </div>
          </div>
        )}

        {/* Recharts Graphs */}
        {rawGraphData.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Chart 1: Composite Risk Trend */}
            <div className="glass rounded-3xl p-5 border border-border/50 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-display font-bold text-base">Composite Risk Trend</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Overall assessment risk percentage over time</p>
                </div>
              </div>
              <div className="h-[280px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredGraphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" />
                    <YAxis domain={[0, 100]} stroke="#64748B" />
                    <Tooltip contentStyle={{ borderRadius: "1rem", border: "1px solid #E2E8F0" }} />
                    <Line type="monotone" dataKey="risk" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Risk Score %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Modality Breakdown Trend */}
            <div className="glass rounded-3xl p-5 border border-border/50 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-display font-bold text-base">Modality Breakdown</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Vocal instability, handwriting, and symptoms tracking</p>
                </div>
              </div>
              <div className="h-[280px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredGraphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" />
                    <YAxis domain={[0, 100]} stroke="#64748B" />
                    <Tooltip contentStyle={{ borderRadius: "1rem", border: "1px solid #E2E8F0" }} />
                    <Legend iconType="circle" />
                    <Line type="monotone" dataKey="symptoms" stroke="#10B981" strokeWidth={2} name="Symptoms" />
                    <Line type="monotone" dataKey="voice" stroke="#F59E0B" strokeWidth={2} name="Voice" />
                    <Line type="monotone" dataKey="handwriting" stroke="#8B5CF6" strokeWidth={2} name="Handwriting" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        ) : (
          <div className="glass rounded-3xl p-12 text-center border border-border/50">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h4 className="font-semibold text-base">No Screening History Available</h4>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
              Graphs will begin tracking values once you complete your initial assessment.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
