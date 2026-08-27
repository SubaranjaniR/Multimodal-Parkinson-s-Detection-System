import { api, type DashboardAnalytics } from "@/lib/api";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Activity, ShieldAlert, Award, Calendar, ChevronRight, Play, TrendingUp, Sparkles, Loader2, Heart, Clock, ArrowUpRight, ArrowDownRight, Minus, AlertCircle
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, PieChart, Pie
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — NeuroPark AI" },
      { name: "description", content: "View your historical screening progress, rewards, and status." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [periodType, setPeriodType] = useState<"daily" | "weekly" | "monthly">("daily");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("np-token");
    if (!token) {
      router.navigate({ to: "/login" });
      return;
    }

    const loadSummaryData = async () => {
      try {
        const u = await api.getMe();
        setUser(u);
        
        const data = await api.getAnalytics();
        setAnalytics(data);
        
        const rew = await api.getRewards();
        setRewards(rew);
        
        setLoading(false);

        // Load complete history asynchronously to optimize first contentful paint
        const hist = await api.getHistory();
        setHistory(hist);
        setLoadingHistory(false);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load dashboard metrics. Verify backend connection.");
        setLoading(false);
      }
    };

    loadSummaryData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-aurora">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading patient health portal...</p>
        </div>
      </div>
    );
  }

  // Formatting dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    try {
      const dt = new Date(dateStr);
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return "text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20";
    if (risk >= 30) return "text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
    return "text-green-600 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20";
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 70) return "High Risk";
    if (risk >= 30) return "Moderate Risk";
    return "Low Risk";
  };

  // Pie chart data
  const pieData = analytics ? [
    { name: "Low Risk (0-30%)", value: analytics.distribution.low, color: "#10b981" },
    { name: "Moderate (31-60%)", value: analytics.distribution.moderate, color: "#f59e0b" },
    { name: "High Risk (61-100%)", value: analytics.distribution.high, color: "#ef4444" }
  ].filter(d => d.value > 0) : [];

  // Grouped periods data based on periodType toggle
  const groupedData = analytics?.grouped[periodType] || [];

  return (
    <div className="bg-aurora min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8 animate-[fade-in_0.4s_ease-out]">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Patient Portal</div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground">
              Welcome back, <span className="gradient-text">{user?.name}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Clinically monitor neurological assessment markers and longitudinal trends</p>
          </div>
          <Link
            to="/predict"
            className="inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all w-fit cursor-pointer"
          >
            <Play className="h-4 w-4 fill-white" />
            New Screening Assessment
          </Link>
        </header>

        {/* 7 Core Medical Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Card 1: Total Predictions */}
          <div className="glass rounded-2xl p-5 border border-border/50 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Predictions</span>
              <div className="text-2xl font-bold mt-1 text-foreground">{analytics?.totalPredictions || 0}</div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Last: {formatDate(analytics?.lastPredictionDate)}</span>
            </div>
          </div>

          {/* Card 2: Latest Prediction Risk */}
          <div className="glass rounded-2xl p-5 border border-border/50 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latest Risk Score</span>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {analytics?.totalPredictions && analytics.totalPredictions > 0 ? `${analytics.latestRisk}%` : "0%"}
              </div>
            </div>
            <div className="mt-3">
              {analytics?.totalPredictions && analytics.totalPredictions > 0 ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRiskColor(analytics.latestRisk)}`}>
                  {getRiskLabel(analytics.latestRisk)}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">No screens done</span>
              )}
            </div>
          </div>

          {/* Card 3: Average Risk Score */}
          <div className="glass rounded-2xl p-5 border border-border/50 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average Risk</span>
              <div className="text-2xl font-bold mt-1 text-foreground">{analytics?.averageRisk || 0}%</div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-3 flex items-center gap-2">
              <span>Min: {analytics?.lowestRisk || 0}%</span>
              <span>•</span>
              <span>Max: {analytics?.highestRisk || 0}%</span>
            </div>
          </div>

          {/* Card 4: Risk Trend Indicator */}
          <div className="glass rounded-2xl p-5 border border-border/50 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Risk Trend (Last 5)</span>
              <div className="text-2xl font-bold mt-1 text-foreground flex items-center gap-1.5 font-display">
                {analytics?.riskTrend === "Increased" && (
                  <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                    <ArrowUpRight className="h-5 w-5" /> Increased
                  </span>
                )}
                {analytics?.riskTrend === "Decreased" && (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <ArrowDownRight className="h-5 w-5" /> Decreased
                  </span>
                )}
                {analytics?.riskTrend === "Stable" && (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Minus className="h-5 w-5" /> Stable
                  </span>
                )}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-3">
              Longitudinal progress state
            </div>
          </div>

        </div>

        {/* Analytics Charts & Details Panel */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left / Middle: Longitudinal graphs & breakdown */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Grouped Risk Trend Chart */}
            <div className="glass rounded-3xl p-6 border border-border/50 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Longitudinal Health Trend</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Average risk scoring calculated over grouped timeframe brackets</p>
                </div>
                <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold w-fit">
                  {(["daily", "weekly", "monthly"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPeriodType(t)}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer capitalize ${periodType === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-64 w-full pt-4">
                {groupedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={groupedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                      <XAxis dataKey="period" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ 
                          background: "var(--background)", 
                          borderColor: "var(--border)", 
                          borderRadius: "12px", 
                          fontSize: "12px", 
                          color: "var(--foreground)" 
                        }} 
                      />
                      <Area type="monotone" dataKey="avgRisk" name="Avg Risk Score" stroke="rgb(99, 102, 241)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRisk)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center border border-dashed border-border/60 rounded-2xl bg-muted/10">
                    <div className="text-center space-y-1 p-4">
                      <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">Complete assessments to view risk trends</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Grid of Risk Distribution & Modality Contributions */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* Risk Distribution Chart */}
              <div className="glass rounded-3xl p-6 border border-border/50 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Risk Distribution</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Summary split of all historical prediction statuses</p>
                </div>
                <div className="h-44 w-full flex items-center justify-center">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            background: "var(--background)", 
                            borderColor: "var(--border)", 
                            borderRadius: "12px", 
                            fontSize: "11px" 
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-muted-foreground">No prediction data available</div>
                  )}
                </div>
                <div className="flex justify-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" /> Low</div>
                  <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" /> Moderate</div>
                  <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" /> High</div>
                </div>
              </div>

              {/* Modality Contribution progress bars */}
              <div className="glass rounded-3xl p-6 border border-border/50 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Modality Contributions</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Average scores of latest screening components</p>
                </div>
                <div className="space-y-3 pt-2">
                  
                  {/* Symptoms Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Symptoms Model</span>
                      <span className="font-mono text-foreground font-bold">{analytics?.latestContribution.symptoms || 0}%</span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-500" style={{ width: `${analytics?.latestContribution.symptoms || 0}%` }} />
                    </div>
                  </div>

                  {/* Handwriting Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Handwriting Model</span>
                      <span className="font-mono text-foreground font-bold">{Math.round(analytics?.latestContribution.handwriting || 0)}%</span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-500" style={{ width: `${analytics?.latestContribution.handwriting || 0}%` }} />
                    </div>
                  </div>

                  {/* Voice Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Voice Model</span>
                      <span className="font-mono text-foreground font-bold">
                        {analytics?.latestContribution.voice && analytics.latestContribution.voice > 0 ? `${Math.round(analytics.latestContribution.voice)}%` : "Not Uploaded"}
                      </span>
                    </div>
                    <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-500" style={{ width: `${analytics?.latestContribution.voice || 0}%` }} />
                    </div>
                  </div>

                  {/* MRI Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-muted-foreground/60">MRI Model (Future)</span>
                      <span className="font-mono text-muted-foreground/60 text-[10px]">Pending integration</span>
                    </div>
                    <div className="w-full bg-muted/20 h-2 rounded-full overflow-hidden">
                      <div className="bg-muted h-full" style={{ width: `0%` }} />
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* 3. Prediction Timeline */}
            <div className="glass rounded-3xl p-6 border border-border/50 space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Prediction Timeline</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Chronological summary of previous assessments</p>
              </div>
              <div className="relative pl-6 border-l border-border/60 ml-2 space-y-6 pt-2">
                {loadingHistory ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Loading timeline history...</span>
                  </div>
                ) : history.length > 0 ? (
                  history.slice(0, 3).map((h) => {
                    const dt = new Date(h.date);
                    const dateFormatted = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    return (
                      <div key={h.id} className="relative">
                        {/* Dot indicator */}
                        <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-primary border-4 border-background shadow" />
                        <div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-xs font-bold text-foreground">{dateFormatted}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRiskColor(h.final_risk)}`}>
                              {getRiskLabel(h.final_risk)} ({h.final_risk}%)
                            </span>
                            <span className="text-[10px] text-muted-foreground">Confidence: {Math.round(h.confidence)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">No predictions timeline available yet.</p>
                )}
              </div>
            </div>

          </div>

          {/* Right sidebar: Recent Lists & Badges */}
          <div className="space-y-6">
            
            {/* Recent Assessments */}
            <div className="glass rounded-3xl p-6 border border-border/50 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-display text-base font-bold">Recent Assessments</h3>
                <div className="mt-4 space-y-3.5">
                  {loadingHistory ? (
                    <div className="flex items-center gap-2 py-6 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Loading recent screens...</span>
                    </div>
                  ) : history.length > 0 ? (
                    history.slice(0, 4).map((h) => {
                      const dt = new Date(h.date);
                      const formatted = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      return (
                        <div key={h.id} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{getRiskLabel(h.final_risk)}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {formatted}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getRiskColor(h.final_risk)}`}>
                              {h.final_risk}%
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">No assessments found.</p>
                  )}
                </div>
              </div>

              {!loadingHistory && history.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <Link to="/history" className="text-xs font-bold text-primary flex items-center justify-center gap-1 hover:underline">
                    View Complete History <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Smart Recommendations */}
            {analytics?.totalPredictions && analytics.totalPredictions > 0 && (
              <div className="glass rounded-3xl p-6 border border-border/50 space-y-4">
                <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Heart className="h-4 w-4 text-red-500" />
                  Smart Recommendations
                </h4>
                <ul className="space-y-3.5 text-xs leading-relaxed">
                  {analytics.latestContribution.voice >= 50 && (
                    <li className="flex gap-2 text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <div>
                        <strong className="text-foreground">Voice Exercises:</strong> Speech therapy and regular loud-speaking practices are recommended due to elevated voice jitter/shimmer.
                      </div>
                    </li>
                  )}
                  {analytics.latestContribution.handwriting >= 50 && (
                    <li className="flex gap-2 text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      <div>
                        <strong className="text-foreground">Hand Dexterity:</strong> Consider tracing spiral shapes or finger tapping exercises to retain hand-eye coordination.
                      </div>
                    </li>
                  )}
                  {analytics.latestRisk >= 70 && (
                    <li className="flex gap-2 text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <div>
                        <strong className="text-foreground">Consult Clinician:</strong> A high composite score indicates clinical review is necessary. Share your screening PDF reports with a doctor.
                      </div>
                    </li>
                  )}
                  {analytics.latestRisk < 70 && analytics.latestContribution.voice < 50 && analytics.latestContribution.handwriting < 50 && (
                    <li className="flex gap-2 text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                      <div>
                        <strong className="text-foreground">Maintain Baseline:</strong> Keep physically active, prioritize sleep quality, and maintain your regular assessment schedule.
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Badges & Rewards */}
            <div className="glass rounded-3xl p-6 border border-border/50 flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rewards & Badges</span>
                  <div className="text-2xl font-bold mt-1 text-foreground">{rewards?.totalPoints || 0} pts</div>
                </div>
                <div className="h-10 w-10 grid place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span>Active Rank: <strong className="text-foreground">{rewards?.activeBadge || "Bronze"} Level</strong></span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
