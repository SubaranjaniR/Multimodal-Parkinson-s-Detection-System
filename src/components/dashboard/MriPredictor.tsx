import { useState } from "react";
import { Loader2, Sparkles, Brain, Check, ShieldAlert, ArrowRight, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import { api, type MriPredictionResult } from "@/lib/api";
import { FileDrop } from "./FileDrop";

interface MriPredictorProps {
  mriFile: File | null;
  onFileChange: (file: File | null) => void;
  mriResult: MriPredictionResult | null;
  onResultChange: (result: MriPredictionResult | null) => void;
  onBack: () => void;
  onComplete: () => void;
  isCompleting?: boolean;
}

export function MriPredictor({
  mriFile,
  onFileChange,
  mriResult,
  onResultChange,
  onBack,
  onComplete,
  isCompleting = false,
}: MriPredictorProps) {
  const [loading, setLoading] = useState(false);

  const handleMriChange = (file: File | null) => {
    onFileChange(file);
    onResultChange(null);
  };

  const analyzeMri = async () => {
    if (!mriFile) {
      toast.error("Please upload an MRI scan image first.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.predictMri(mriFile);
      onResultChange(res);
      toast.success("MRI brain scan analysis complete!");
    } catch (err: any) {
      console.error("MRI prediction failed:", err);
      const errMsg = err?.message || "Failed to analyze MRI scan image.";
      toast.error(`MRI analysis failed: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const isParkinson = mriResult?.prediction?.toLowerCase().includes("parkinson");

  return (
    <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
          <Brain className="h-4 w-4" /> Deep Learning Neuroimaging
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold mt-1">MRI Brain Scan Analysis</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a structural T1/T2 axial brain MRI scan to evaluate neurodegenerative patterns using deep convolutional neural networks.
        </p>
      </div>

      <div className="space-y-4">
        <FileDrop
          accept=".jpg,.jpeg,.png,image/*"
          label="Upload MRI Brain Scan Image"
          file={mriFile}
          onFile={handleMriChange}
          preview={(f) => (
            <div className="flex flex-col items-center justify-center p-2">
              <img
                alt="MRI Scan Preview"
                src={URL.createObjectURL(f)}
                className="max-h-64 rounded-xl border border-border/80 shadow-md object-contain bg-black/40"
              />
              <span className="text-xs text-muted-foreground mt-2">Original MRI Scan</span>
            </div>
          )}
        />
      </div>

      {/* Analysis action when file is selected and not yet analyzed */}
      {mriFile && !loading && !mriResult && (
        <div className="pt-2">
          <button
            type="button"
            onClick={analyzeMri}
            className="w-full sm:w-auto rounded-xl gradient-brand text-white px-8 py-3.5 font-semibold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> Analyze MRI
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <div className="font-semibold text-sm">Processing MRI Neuroimaging</div>
            <p className="text-xs text-muted-foreground mt-1">
              Extracting feature activations and computing Grad-CAM saliency heatmaps...
            </p>
          </div>
        </div>
      )}

      {/* MRI Results & Grad-CAM Visualization */}
      {mriResult && (
        <div className="space-y-6 pt-2">
          {/* Main Prediction Badge & Probability Cards */}
          <div
            className={`p-5 rounded-2xl border ${
              isParkinson
                ? "border-red-500/30 bg-red-500/10 dark:bg-red-500/15"
                : "border-green-500/30 bg-green-500/10 dark:bg-green-500/15"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  MRI Diagnostic Prediction
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3
                    className={`text-xl font-bold ${
                      isParkinson ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {mriResult.prediction}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isParkinson
                        ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                        : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    }`}
                  >
                    {isParkinson ? <ShieldAlert className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                    {mriResult.confidence}% Confidence
                  </span>
                </div>
              </div>

              {mriResult.probabilities && (
                <div className="grid grid-cols-2 gap-2 text-xs bg-card/60 backdrop-blur border border-border/50 p-2.5 rounded-xl">
                  {Object.entries(mriResult.probabilities).map(([className, prob]) => (
                    <div key={className} className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">{className}</span>
                      <span className="font-bold text-foreground">{prob}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grad-CAM Heatmap Visualization */}
          {mriResult.explanation?.heatmap && (
            <div className="p-5 rounded-2xl border border-border bg-card/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Grad-CAM Visual Explanations</h4>
                </div>
                <span className="text-[10px] font-semibold uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {mriResult.explanation.method || "Grad-CAM"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 items-center">
                {mriFile && (
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Original MRI Input</div>
                    <img
                      src={URL.createObjectURL(mriFile)}
                      alt="Original MRI"
                      className="max-h-56 w-auto rounded-xl border border-border object-contain bg-black/40"
                    />
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Grad-CAM Activation Heatmap</div>
                  <img
                    src={`data:image/png;base64,${mriResult.explanation.heatmap}`}
                    alt="Grad-CAM Heatmap"
                    className="max-h-56 w-auto rounded-xl border border-primary/30 shadow-lg object-contain bg-black/40"
                  />
                </div>
              </div>

              {mriResult.explanation.summary && (
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {mriResult.explanation.summary}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-border bg-card px-5 py-2.5 font-medium cursor-pointer hover:bg-muted transition-colors"
        >
          Back to Handwriting
        </button>

        <div className="flex items-center gap-3">
          {mriResult && (
            <button
              type="button"
              onClick={analyzeMri}
              disabled={loading}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold cursor-pointer hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Re-analyze
            </button>
          )}

          <button
            type="button"
            onClick={onComplete}
            disabled={isCompleting || loading}
            className="rounded-xl gradient-brand text-white px-8 py-3 font-semibold shadow-xl shadow-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
          >
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Finalizing Assessment…
              </>
            ) : (
              <>
                Generate Multimodal Report <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
