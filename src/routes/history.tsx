import { api, type PredictionHistoryRecord } from "@/lib/api";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect, Fragment } from "react";
import { toast } from "sonner";
import { 
  Loader2, Search, Calendar, FileText, Download, SlidersHorizontal, ArrowUpDown, ChevronDown, ChevronUp, Trash2, AlertCircle, Eye, Info
} from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Screening History — NeuroPark AI" },
      { name: "description", content: "Access and search all your completed early screening assessment records." },
    ],
  }),
  component: History,
});

function History() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  
  // Filters state
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Deletion modal state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();

  const fetchHistory = async () => {
    try {
      const hist = await api.getHistory();
      setHistory(hist);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load prediction history: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("np-token");
    if (!token) {
      router.navigate({ to: "/login" });
      return;
    }
    fetchHistory();
  }, []);

  const handleDownload = async (id: number) => {
    setDownloadingId(id);
    try {
      const blob = await api.downloadPreviousReport(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neuropark-report-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Clinical report PDF downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to download PDF report: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (deleteTargetId === null) return;
    setDeleting(true);
    try {
      await api.deletePrediction(deleteTargetId);
      toast.success("Screening record deleted successfully.");
      setDeleteTargetId(null);
      fetchHistory();
      if (expandedRow === deleteTargetId) {
        setExpandedRow(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete prediction record.");
    } finally {
      setDeleting(false);
    }
  };

  // Filter history
  const filtered = history.filter((row) => {
    if (search) {
      const q = search.toLowerCase();
      const matchLabel = getRiskLabel(row.final_risk).toLowerCase().includes(q);
      const matchPrediction = row.prediction.toLowerCase().includes(q);
      if (!matchLabel && !matchPrediction) return false;
    }
    if (filterRisk) {
      if (getRiskLabel(row.final_risk) !== filterRisk) return false;
    }
    if (filterDateRange) {
      const rowDate = new Date(row.date);
      const now = new Date();
      if (filterDateRange === "7days") {
        const diff = now.getTime() - rowDate.getTime();
        if (diff > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (filterDateRange === "30days") {
        const diff = now.getTime() - rowDate.getTime();
        if (diff > 30 * 24 * 60 * 60 * 1000) return false;
      } else if (filterDateRange === "year") {
        if (rowDate.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });

  // Sort history
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "date_desc") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === "date_asc") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === "risk_desc") {
      return b.final_risk - a.final_risk;
    } else if (sortBy === "risk_asc") {
      return a.final_risk - b.final_risk;
    }
    return 0;
  });

  // Pagination slicing
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginatedHistory = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  return (
    <div className="bg-aurora min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Wellness Tracking</div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground">Assessment History</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">Review, search, and manage your early screening records</p>
          </div>
          <Link
            to="/predict"
            className="rounded-xl gradient-brand text-white px-5 py-2.5 text-sm font-semibold shadow-lg shadow-primary/30 w-fit cursor-pointer"
          >
            Run New Assessment
          </Link>
        </header>

        {/* Advanced Filters Panel */}
        <div className="glass rounded-2xl p-4 sm:p-5 border border-border/50 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search result classification..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card/50 text-sm focus:outline-none focus:border-primary focus:bg-card text-foreground"
            />
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <select
              value={filterRisk}
              onChange={(e) => { setFilterRisk(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 rounded-xl border border-border bg-card/50 text-sm focus:outline-none focus:border-primary focus:bg-card cursor-pointer text-foreground"
            >
              <option value="">All Risk Levels</option>
              <option value="High Risk">High Risk</option>
              <option value="Moderate Risk">Moderate Risk</option>
              <option value="Low Risk">Low Risk</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <select
              value={filterDateRange}
              onChange={(e) => { setFilterDateRange(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 rounded-xl border border-border bg-card/50 text-sm focus:outline-none focus:border-primary focus:bg-card cursor-pointer text-foreground"
            >
              <option value="">All Dates</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-border bg-card/50 text-sm focus:outline-none focus:border-primary focus:bg-card cursor-pointer text-foreground"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="risk_desc">Risk: High to Low</option>
              <option value="risk_asc">Risk: Low to High</option>
            </select>
          </div>

        </div>

        {/* History Cards List */}
        {loading ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading your prediction records...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedHistory.length > 0 ? (
              paginatedHistory.map((row) => {
                const dateObj = new Date(row.date);
                const formattedDate = dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                });
                const formattedTime = dateObj.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit"
                });
                
                const isExpanded = expandedRow === row.id;
                
                return (
                  <div key={row.id} className="glass rounded-2xl border border-border/50 overflow-hidden transition-all duration-300">
                    
                    {/* Header Row */}
                    <div 
                      onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                      className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{formattedDate}</span>
                            <span className="text-xs text-muted-foreground font-normal">{formattedTime}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Confidence: {Math.round(row.confidence)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(row.final_risk)}`}>
                          {getRiskLabel(row.final_risk)} ({row.final_risk}%)
                        </span>
                        
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDownload(row.id)}
                            disabled={downloadingId === row.id}
                            title="Download Report"
                            className="p-2 text-primary hover:bg-muted rounded-lg transition-colors cursor-pointer border border-border bg-card"
                          >
                            {downloadingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(row.id)}
                            title="Delete Record"
                            className="p-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer border border-border bg-card"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="text-muted-foreground p-1">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expand Detail Drawer */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/5 p-5 sm:p-6">
                        <HistoryRowDetails row={row} />
                      </div>
                    )}

                  </div>
                );
              })
            ) : (
              <div className="glass rounded-2xl text-center py-16 px-4 space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground/60 mx-auto" />
                <h3 className="font-semibold text-base">No predictions found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  We couldn't find any completed assessments matching your current search parameters.
                </p>
                <Link
                  to="/predict"
                  className="inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-2 text-sm font-semibold text-white cursor-pointer"
                >
                  Initiate Screening
                </Link>
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4">
                <span className="text-xs text-muted-foreground font-semibold">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold hover:bg-muted cursor-pointer disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold hover:bg-muted cursor-pointer disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Delete Record Confirmation Modal */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)} />
          <div className="relative glass w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-red-500/20 bg-background/95 animate-[scale-up_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
            <h3 className="font-display text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 animate-pulse" />
              Delete Assessment Record?
            </h3>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Are you absolutely sure? This will permanently delete this early screening prediction, the associated PDF clinical report, and any uploaded handwriting scans or voice files from our servers. This cannot be undone.
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-medium hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs shadow-lg shadow-red-600/30 hover:bg-red-700 flex items-center gap-2 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

interface HistoryRowDetailsProps {
  row: PredictionHistoryRecord;
}

function HistoryRowDetails({ row }: HistoryRowDetailsProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [parsedSymptoms, setParsedSymptoms] = useState<any>(null);

  useEffect(() => {
    if (row.symptoms_json) {
      try {
        setParsedSymptoms(JSON.parse(row.symptoms_json));
      } catch (e) {
        console.error("Failed to parse symptoms_json", e);
      }
    }

    const loadMedia = async () => {
      setLoadingMedia(true);
      try {
        if (row.spiral_image_path) {
          const imgBlob = await api.getHandwritingImage(row.id);
          setImageUrl(URL.createObjectURL(imgBlob));
        }
        if (row.voice_path) {
          const voiceBlob = await api.getVoiceRecording(row.id);
          setVoiceUrl(URL.createObjectURL(voiceBlob));
        }
      } catch (err) {
        console.error("Error loading media files", err);
      } finally {
        setLoadingMedia(false);
      }
    };

    loadMedia();

    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    };
  }, [row.id]);

  const getRiskLabel = (risk: number) => {
    if (risk >= 70) return "High Risk";
    if (risk >= 30) return "Moderate Risk";
    return "Low Risk";
  };

  return (
    <div className="space-y-6 text-foreground animate-[fade-in_0.3s_ease-out]">
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Symptoms block */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-primary">
            Symptom Variables Profile
          </h4>
          {parsedSymptoms ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div><span className="text-muted-foreground font-medium">Age:</span> {parsedSymptoms.age}</div>
              <div><span className="text-muted-foreground font-medium">Gender:</span> {parsedSymptoms.gender}</div>
              <div><span className="text-muted-foreground font-medium">Family History:</span> {parsedSymptoms.familyHistory ? "Yes" : "No"}</div>
              <div><span className="text-muted-foreground font-medium">UPDRS:</span> {parsedSymptoms.updrs}</div>
              <div><span className="text-muted-foreground font-medium">MoCA:</span> {parsedSymptoms.moca}</div>
              <div><span className="text-muted-foreground font-medium">Tremor:</span> {parsedSymptoms.tremor}/10</div>
              <div><span className="text-muted-foreground font-medium">Rigidity:</span> {parsedSymptoms.rigidity}/10</div>
              <div><span className="text-muted-foreground font-medium">Bradykinesia:</span> {parsedSymptoms.bradykinesia}/10</div>
              <div><span className="text-muted-foreground font-medium">Speech:</span> {parsedSymptoms.speechProblems}/10</div>
              <div><span className="text-muted-foreground font-medium">Sleep Issues:</span> {parsedSymptoms.sleepDisorders}/10</div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No symptom details available.</p>
          )}
        </div>

        {/* Handwriting block */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-primary">
              Handwriting (Spiral Image)
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Spiral handwriting test image used for analysis</p>
          </div>
          <div className="mt-2 flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden border border-border/40 min-h-[140px]">
            {loadingMedia ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : imageUrl ? (
              <img src={imageUrl} alt="Spiral Handwriting" className="max-h-[140px] w-auto object-contain rounded" />
            ) : (
              <span className="text-xs text-muted-foreground text-center p-2">No image uploaded</span>
            )}
          </div>
        </div>

        {/* Voice block */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-primary">
              Voice Sample Recording
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Secure acoustic sound recording play controls</p>
          </div>
          <div className="mt-2 flex-1 flex flex-col justify-center items-center bg-muted/30 rounded-lg p-3 border border-border/40 min-h-[140px]">
            {loadingMedia ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : voiceUrl ? (
              <div className="w-full space-y-2">
                <audio src={voiceUrl} controls className="w-full h-8" />
                <div className="text-[10px] text-center text-muted-foreground">Secure user recording</div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground text-center p-2">No voice recording uploaded</span>
            )}
          </div>
        </div>

      </div>

      {/* Recommendations & Report row */}
      <div className="p-5 rounded-xl bg-card border border-border flex flex-col sm:flex-row gap-4 items-start justify-between">
        <div className="space-y-1.5 max-w-2xl">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-primary flex items-center gap-1">
            <Info className="h-4 w-4" /> Recommended Next Steps
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            {row.final_risk >= 70 ? (
              <span className="text-red-600 dark:text-red-400 font-bold">
                HIGH RISK DETECTED: We strongly recommend scheduling an appointment with a primary care doctor or clinical neurologist. Please download the detailed PDF report below and bring it to your next consultation.
              </span>
            ) : row.final_risk >= 30 ? (
              <span>
                MODERATE RISK DETECTED: Periodically monitor your symptoms. Consider repeating the screening assessments once every month, and contact a clinician if you observe sudden motor or sleep changes.
              </span>
            ) : (
              <span>
                LOW RISK DETECTED: Continue healthy routines including light cardio exercise and cognitive stimulation games. Repeat the screening test annually or if new symptoms occur.
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link
            to="/predict"
            className="flex-1 sm:flex-none text-center rounded-xl bg-muted hover:bg-muted/70 text-xs font-semibold px-4 py-2 border border-border cursor-pointer text-foreground"
          >
            Retest Symptoms
          </Link>
        </div>
      </div>

    </div>
  );
}
