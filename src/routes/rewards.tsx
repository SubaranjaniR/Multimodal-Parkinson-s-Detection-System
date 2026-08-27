import { api } from "@/lib/api";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Loader2, Award, Calendar, ChevronRight, Zap, Trophy, ShieldCheck, Star
} from "lucide-react";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Gamified Rewards — NeuroPark AI" },
      { name: "description", content: "Review your unlocked health badges, points, and milestone history." },
    ],
  }),
  component: Rewards,
});

function Rewards() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("np-token");
    if (!token) {
      router.navigate({ to: "/login" });
      return;
    }
    
    const loadRewards = async () => {
      try {
        const res = await api.getRewards();
        setData(res);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load rewards: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadRewards();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-aurora">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your reward dashboard...</p>
        </div>
      </div>
    );
  }

  const totalPoints = data?.totalPoints || 0;
  const activeBadge = data?.activeBadge || "Bronze";
  const history = data?.history || [];

  // Badges metadata definitions
  const badgeDetails = [
    {
      name: "Bronze",
      threshold: 0,
      gradient: "from-amber-700 to-amber-900 shadow-amber-700/20",
      description: "Unlocked at starting baseline assessment",
      icon: Star
    },
    {
      name: "Silver",
      threshold: 200,
      gradient: "from-slate-400 to-slate-600 shadow-slate-500/20",
      description: "Unlocked at 200 total points",
      icon: ShieldCheck
    },
    {
      name: "Gold",
      threshold: 500,
      gradient: "from-amber-400 to-amber-600 shadow-amber-500/20",
      description: "Unlocked at 500 total points",
      icon: Trophy
    },
    {
      name: "Diamond",
      threshold: 1000,
      gradient: "from-cyan-400 to-blue-500 shadow-blue-500/20",
      description: "Unlocked at 1000 total points",
      icon: Award
    }
  ];

  return (
    <div className="bg-aurora min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Header */}
        <header>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Patient Milestones</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Health Rewards</h1>
          <p className="text-sm text-muted-foreground mt-1">Earn points and unlock badges by staying active and improving scores</p>
        </header>

        {/* Hero points card */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-border/50 grid md:grid-cols-3 gap-6 items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="md:col-span-2 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Zap className="h-3.5 w-3.5 fill-current" />
              Active Level: {activeBadge}
            </div>
            <h2 className="font-display text-2xl font-bold">
              {totalPoints >= 1000 
                ? "🎉 Peak Wellness Achieved!" 
                : totalPoints >= 500 
                  ? "🏆 Excellent Progress, Keep Going!" 
                  : "🥇 Keep up the great screening routines!"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Screening regularly helps establish solid medical baselines. You get 50 points per assessment, and bonus points whenever you achieve positive progress!
            </p>
          </div>

          <div className="text-center md:border-l border-border/40 py-4 flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Reward Points</span>
            <div className="text-5xl font-black gradient-text mt-2">{totalPoints}</div>
            <span className="text-xs text-muted-foreground mt-1">Points accumulated</span>
          </div>
        </div>

        {/* Badges showcase section */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-bold text-foreground">Screening Badges</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {badgeDetails.map((b) => {
              const isUnlocked = totalPoints >= b.threshold;
              const isActive = activeBadge === b.name;
              const Icon = b.icon;
              
              return (
                <div 
                  key={b.name} 
                  className={`glass rounded-2xl p-5 border relative overflow-hidden transition-all flex flex-col justify-between items-center text-center ${
                    isUnlocked 
                      ? "border-border/60 hover:-translate-y-1" 
                      : "opacity-40 border-dashed border-border/80"
                  } ${isActive ? "ring-2 ring-primary shadow-lg" : ""}`}
                >
                  {/* Badge shape */}
                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${b.gradient} text-white flex items-center justify-center shadow-lg mb-4`}>
                    <Icon className="h-8 w-8" />
                  </div>

                  <div>
                    <h4 className="font-bold text-base">{b.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[160px] mx-auto">{b.description}</p>
                  </div>

                  <div className="mt-4">
                    {isUnlocked ? (
                      <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Point ledger/history */}
        <section className="space-y-4">
          <h3 className="font-display text-xl font-bold text-foreground">Milestone Ledger</h3>
          <div className="glass rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/60">
            {history.map((h: any, idx: number) => {
              const dt = new Date(h.created_at);
              const formattedDate = dt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              });
              
              return (
                <div key={idx} className="p-4 sm:p-5 flex justify-between items-center hover:bg-muted/10 transition-colors">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{h.message || "Assessment Completed"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {formattedDate}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.badge && (
                      <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">
                        {h.badge} Level
                      </span>
                    )}
                    <span className="text-sm font-black text-green-600 bg-green-500/10 px-3 py-1 rounded-lg border border-green-500/20">
                      +{h.points} pts
                    </span>
                  </div>
                </div>
              );
            })}
            {history.length === 0 && (
              <p className="text-sm text-muted-foreground py-10 text-center">No points milestones recorded yet.</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
