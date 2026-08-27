import { api, type FinalPrediction, type SymptomsInput, type MriPredictionResult } from "@/lib/api";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { 
  Check, Loader2, Sparkles, Mic, Square, Trash2, Trophy, ShieldAlert, 
  ArrowUp, ArrowDown, MoveRight, FileAudio, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { SymptomsForm } from "@/components/dashboard/SymptomsForm";
import { FileDrop } from "@/components/dashboard/FileDrop";
import { VoiceWaveform } from "@/components/dashboard/VoiceWaveform";
import { ResultView } from "@/components/dashboard/ResultView";
import { AIChat } from "@/components/dashboard/AIChat";
import { MriPredictor } from "@/components/dashboard/MriPredictor";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Prediction Dashboard — NeuroPark AI" },
      { name: "description", content: "Run a multimodal Parkinson's prediction using symptoms, voice, handwriting, and MRI scans." },
    ],
  }),
  component: Predict,
});

const initialSymptoms: SymptomsInput = {
  age: 60, gender: "Male", familyHistory: false,
  tremor: 3, rigidity: 2, bradykinesia: 3, posturalInstability: 2, speechProblems: 1, sleepDisorders: 2,
  updrs: 0, moca: 0, functionalAssessment: 0,
};

function Predict() {
  const [step, setStep] = useState(0);
  const [maxStepUnlocked, setMaxStepUnlocked] = useState(0);
  const [symptoms, setSymptoms] = useState<SymptomsInput>(initialSymptoms);
  const [voice, setVoice] = useState<File | null>(null);
  const [hand, setHand] = useState<File | null>(null);
  const [mri, setMri] = useState<File | null>(null);
  
  // Real-time analysis states
  const [voiceResult, setVoiceResult] = useState<any | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [handResult, setHandResult] = useState<any | null>(null);
  const [handLoading, setHandLoading] = useState(false);
  const [mriResult, setMriResult] = useState<MriPredictionResult | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FinalPrediction | null>(null);
  const router = useRouter();

  // Audio Recording States
  const [voiceInputType, setVoiceInputType] = useState<"upload" | "record">("upload");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pcmBuffers, setPcmBuffers] = useState<Float32Array[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scriptProcessor, setScriptProcessor] = useState<ScriptProcessorNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  
  const timerRef = useRef<any>(null);

  // Authentication Route Guard
  useEffect(() => {
    const token = localStorage.getItem("np-token");
    if (!token) {
      toast.warning("Please sign in to run screening assessments.");
      router.navigate({ to: "/login" });
    }
  }, []);

  const handleVoiceChange = (file: File | null) => {
    setVoice(file);
    setVoiceResult(null);
    setAudioUrl(file ? URL.createObjectURL(file) : null);
  };

  const startRecording = async () => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(userStream);
      
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      setAudioContext(context);
      
      const source = context.createMediaStreamSource(userStream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      setScriptProcessor(processor);
      
      const buffers: Float32Array[] = [];
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        buffers.push(new Float32Array(input));
      };
      
      source.connect(processor);
      processor.connect(context.destination);
      
      setPcmBuffers(buffers);
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioUrl(null);
      setVoice(null);
      setVoiceResult(null);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      
      toast.info("Recording voice stream...");
    } catch (err) {
      console.error("Microphone access failed", err);
      toast.error("Microphone access denied. Please grant permissions.");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (scriptProcessor) {
      scriptProcessor.disconnect();
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close();
    }
    
    // Flatten buffers
    let totalLength = 0;
    for (let i = 0; i < pcmBuffers.length; i++) {
      totalLength += pcmBuffers[i].length;
    }
    const resultPcm = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < pcmBuffers.length; i++) {
      resultPcm.set(pcmBuffers[i], offset);
      offset += pcmBuffers[i].length;
    }
    
    // Encode to WAV format
    const wavBlob = encodeWAV(resultPcm, 16000);
    const recordedFile = new File([wavBlob], "recorded_voice.wav", { type: "audio/wav" });
    
    setVoice(recordedFile);
    setAudioUrl(URL.createObjectURL(recordedFile));
    toast.success("Voice recording saved. Ready for analysis!");
  };

  const deleteRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setVoice(null);
    setAudioUrl(null);
    setVoiceResult(null);
    setPcmBuffers([]);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, "0");
    const secs = (sec % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const analyzeVoice = async () => {
    if (!voice) return;
    setVoiceLoading(true);
    setVoiceResult(null);
    try {
      const res = await api.predictVoice(voice);
      setVoiceResult(res);
      if (res.status === "unavailable") {
        toast.warning("Voice analysis model offline. Baseline placeholder score generated.");
      } else {
        toast.success("Voice analysis complete!");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || "File format/processing error.";
      toast.error(`Voice prediction failed: ${errMsg}`);
      setVoiceResult({ status: "unavailable", error: errMsg });
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleHandwritingChange = (file: File | null) => {
    setHand(file);
    setHandResult(null);
  };

  const analyzeHandwritingAndProceed = async () => {
    if (!hand) {
      toast.info("No handwriting image uploaded. Proceeding to STEP 4 — MRI Brain Scan.");
      goToStep(3);
      return;
    }
    setHandLoading(true);
    setHandResult(null);
    try {
      const res = await api.predictHandwriting(hand);
      setHandResult(res);
      if (res.status === "unavailable") {
        toast.warning("Handwriting model offline. Baseline score generated. Proceeding to MRI.");
      } else {
        toast.success("Handwriting analysis complete! Moving to STEP 4 — MRI Brain Scan.");
      }
      // Automatically advance to Step 4 (MRI) on successful prediction response
      goToStep(3);
    } catch (err: any) {
      console.error("Handwriting analysis error:", err);
      const errMsg = err?.message || "Connection error or image processing issue.";
      toast.error(`Handwriting analysis: ${errMsg}. You can continue to MRI.`);
      setHandResult({ status: "unavailable", error: errMsg });
      // Allow them to still proceed to MRI
      goToStep(3);
    } finally {
      setHandLoading(false);
    }
  };

  const goToStep = (targetStep: number) => {
    setStep(targetStep);
    setMaxStepUnlocked((prev) => Math.max(prev, targetStep));
  };

  const predict = async () => {
    setLoading(true);
    try {
      const voiceScore = voiceResult && voiceResult.status !== "unavailable" ? voiceResult.score : null;
      const handScore = handResult && handResult.status !== "unavailable" ? handResult.score : null;
      const voiceFilename = voiceResult ? voiceResult.filename : null;
      const handwritingFilename = handResult ? handResult.filename : null;
      const mriFilename = mriResult ? mriResult.mri_filename : null;

      const res = await api.predictFinal({
        symptoms,
        voiceScore,
        handwritingScore: handScore,
        voiceFilename,
        handwritingFilename,
        mriFilename,
      });

      setResult(res);
      try { sessionStorage.setItem("np-result", JSON.stringify({ symptoms, result: res })); } catch { /* noop */ }
      
      // Dispatch rewards update event to notify Navbar
      window.dispatchEvent(new Event("auth-change"));
      toast.success("Multimodal screening prediction complete!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to calculate final prediction.");
    } finally { 
      setLoading(false); 
    }
  };

  // Get active risk colors
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

  const getArrowIcon = (status: string) => {
    if (status === "Improved") return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (status === "Declined") return <ArrowDown className="h-3 w-3 text-red-600" />;
    return <MoveRight className="h-3 w-3 text-amber-500" />;
  };

  return (
    <div className="bg-aurora min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Prediction Dashboard</div>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold truncate">Multimodal AI Assessment</h1>
          </div>
          <span className="hidden sm:inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> 4-step workflow
          </span>
        </header>

        {!result && (
          <>
            <Stepper 
              step={step} 
              maxCompletedStep={maxStepUnlocked} 
              onStepClick={(i) => setStep(i)} 
            />

            <div className="mt-6">
              {step === 0 && (
                <SymptomsForm 
                  value={symptoms} 
                  onChange={setSymptoms} 
                  onNext={() => goToStep(1)} 
                />
              )}
              {step === 1 && (
                <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-semibold">Voice Sample Analysis</h2>
                    <p className="text-sm text-muted-foreground mt-1">Record yourself saying sustained "ahh" for 3-5 seconds or upload an existing audio file.</p>
                  </div>

                  {/* Toggle inputs */}
                  <div className="flex bg-muted border border-border p-1 rounded-xl w-fit gap-1">
                    <button
                      onClick={() => { setVoiceInputType("upload"); deleteRecording(); }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        voiceInputType === "upload" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FileAudio className="h-3.5 w-3.5" />
                      Upload File
                    </button>
                    <button
                      onClick={() => { setVoiceInputType("record"); deleteRecording(); }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        voiceInputType === "record" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Mic className="h-3.5 w-3.5" />
                      Record Live
                    </button>
                  </div>

                  {/* Upload Option */}
                  {voiceInputType === "upload" && (
                    <div className="space-y-4">
                      <FileDrop
                        accept=".wav,.mp3,.flac,.m4a,.ogg"
                        label="Drop a .wav, .mp3, .flac, .m4a, or .ogg file"
                        file={voice}
                        onFile={handleVoiceChange}
                        preview={(f) => <VoiceWaveform file={f} />}
                      />
                    </div>
                  )}

                  {/* Recording Live Option */}
                  {voiceInputType === "record" && (
                    <div className="border border-border/60 bg-muted/20 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                      {isRecording ? (
                        <>
                          <div className="h-16 w-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center animate-pulse">
                            <div className="h-6 w-6 bg-red-600 rounded-full" />
                          </div>
                          <div className="text-xl font-bold font-mono tracking-wider">{formatTimer(recordingDuration)}</div>
                          <p className="text-xs text-muted-foreground">Keep speaking clearly into your mic...</p>
                          <button
                            onClick={stopRecording}
                            className="inline-flex items-center gap-1.5 bg-foreground text-background dark:bg-foreground dark:text-background hover:opacity-95 px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                          >
                            <Square className="h-4 w-4 fill-current" />
                            Stop Recording
                          </button>
                        </>
                      ) : audioUrl ? (
                        <>
                          <div className="h-12 w-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-600">
                            <Check className="h-6 w-6" />
                          </div>
                          <h4 className="font-bold text-sm">Live Voice Audio Generated</h4>
                          <audio src={audioUrl} controls className="mx-auto max-w-xs mt-2" />
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={deleteRecording}
                              className="inline-flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/25 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete & Re-record
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary">
                            <Mic className="h-7 w-7" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">Audio Microphone Access Required</h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                              Click start below, accept the browser pop-up prompt, and speak clearly into your mic.
                            </p>
                          </div>
                          <button
                            onClick={startRecording}
                            className="inline-flex items-center gap-1.5 gradient-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer shadow-lg"
                          >
                            <Mic className="h-4 w-4" />
                            Start Recording
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Analysis Buttons */}
                  {voice && !voiceLoading && !voiceResult && (
                    <div className="pt-2">
                      <button
                        onClick={analyzeVoice}
                        className="w-full sm:w-auto rounded-xl gradient-brand text-white px-6 py-3 font-semibold shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        Analyze Voice Recording
                      </button>
                    </div>
                  )}
                  
                  {voiceLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse pt-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> Extracting HuBERT features & predicting...
                    </div>
                  )}

                  {voiceResult && (
                    <div className={`p-4 rounded-xl border ${
                      voiceResult.status === "unavailable" 
                        ? "border-amber-200 bg-amber-50/50" 
                        : (voiceResult.prediction === "Parkinson" 
                          ? "border-red-200 bg-red-50/50" 
                          : "border-green-200 bg-green-50/50")
                    }`}>
                      <div className="text-sm font-semibold">Voice Model Result</div>
                      <div className="mt-2">
                        {voiceResult.status === "unavailable" ? (
                          <span className="text-amber-600 font-medium text-sm">Voice Analysis Unavailable: {voiceResult.error || "Acoustic extraction failed."}</span>
                        ) : (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-w-xs text-xs sm:text-sm">
                            <span className="font-semibold text-muted-foreground uppercase">Prediction:</span>
                            <span className={voiceResult.prediction === "Parkinson" ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                              {voiceResult.prediction}
                            </span>
                            <span className="font-semibold text-muted-foreground uppercase">Confidence:</span>
                            <span className="font-medium text-foreground">{voiceResult.confidence}%</span>
                            <span className="font-semibold text-muted-foreground uppercase">Probability:</span>
                            <span className="font-medium text-foreground">{voiceResult.probability}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-between pt-4 border-t border-border">
                    <button onClick={() => setStep(0)} className="rounded-xl border border-border bg-card px-5 py-2.5 font-medium cursor-pointer hover:bg-muted transition-colors">Back</button>
                    <button onClick={() => goToStep(2)} className="rounded-xl gradient-brand text-white px-6 py-2.5 font-semibold cursor-pointer">Continue → Handwriting</button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="glass rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h2 className="font-display text-xl font-semibold">Handwriting Sample Analysis</h2>
                    <p className="text-sm text-muted-foreground mt-1">Upload a clear photo of a drawn spiral or a paragraph in your handwriting.</p>
                  </div>

                  <div className="space-y-4">
                    <FileDrop
                      accept=".jpg,.jpeg,.png,image/*"
                      label="Drop a .jpg / .jpeg / .png image"
                      file={hand}
                      onFile={handleHandwritingChange}
                      preview={(f) => <img alt="handwriting preview" src={URL.createObjectURL(f)} className="max-h-64 rounded-lg mx-auto" />}
                    />
                  </div>

                  {handLoading && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> Running MobileNetV2 image processing...
                    </div>
                  )}

                  {handResult && (
                    <div className={`p-4 rounded-xl border ${handResult.status === "unavailable" ? "border-amber-200 bg-amber-50/50" : (handResult.prediction === 1 ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50")}`}>
                      <div className="text-sm font-semibold">Handwriting Prediction Result</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {handResult.status === "unavailable" ? (
                          <span className="text-amber-600 font-medium">Handwriting Analysis Unavailable: {handResult.error || "Image processing failed."}</span>
                        ) : (
                          <>
                            Drawing Status: <span className={handResult.prediction === 1 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                              {handResult.prediction === 1 ? "Elevated Risk" : "Normal Baseline"}
                            </span>
                            {handResult.score !== null && (
                              <span> (Confidence: {handResult.score}%)</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-between items-center pt-4 border-t border-border">
                    <button onClick={() => setStep(1)} className="rounded-xl border border-border bg-card px-5 py-2.5 font-medium cursor-pointer hover:bg-muted transition-colors">
                      Back
                    </button>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => goToStep(3)} 
                        className="rounded-xl border border-border bg-card px-5 py-2.5 font-medium cursor-pointer hover:bg-muted transition-colors"
                      >
                        Continue → MRI
                      </button>

                      <button 
                        type="button"
                        onClick={analyzeHandwritingAndProceed} 
                        disabled={handLoading}
                        className="rounded-xl gradient-brand text-white px-8 py-3 font-semibold shadow-xl shadow-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
                      >
                        {handLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
                          </>
                        ) : (
                          <>
                            Run Prediction <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <MriPredictor
                  mriFile={mri}
                  onFileChange={setMri}
                  mriResult={mriResult}
                  onResultChange={setMriResult}
                  onBack={() => setStep(2)}
                  onComplete={predict}
                  isCompleting={loading}
                />
              )}
            </div>
          </>
        )}

        {loading && !result && (
          <div className="mt-8 glass rounded-2xl p-8 space-y-4">
            <div className="h-4 rounded animate-shimmer" />
            <div className="h-4 rounded animate-shimmer w-3/4" />
            <div className="h-4 rounded animate-shimmer w-1/2" />
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-8">
            
            {/* 1. Rewards Popup / banner overlay */}
            {result.rewards && (
              <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 to-primary/20 border border-amber-500/30 rounded-3xl p-6 shadow-xl animate-float">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                    <div className="h-14 w-14 grid place-items-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                      <Trophy className="h-7 w-7" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">Accomplishment Unlocked</span>
                      <h3 className="text-lg font-black text-foreground mt-0.5">{result.rewards.message || "Assessment Completed!"}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Assessment finalized. You earned <strong>+{result.rewards.pointsEarned}</strong> points. Current Badge: <strong>{result.rewards.badge}</strong>.</p>
                    </div>
                  </div>
                  <div className="text-center bg-card/60 backdrop-blur border border-border/50 px-4 py-2 rounded-2xl w-full sm:w-auto">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Total points balance</span>
                    <div className="text-xl font-black text-amber-500 mt-0.5">{result.rewards.totalPoints} pts</div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Main predictions charts and layout */}
            <ResultView result={result} />

            {/* 3. Progress Comparison Delta mapping */}
            {result.comparison && (
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-4">
                <h3 className="font-display text-xl font-semibold">Progress Overlay Summary</h3>
                <p className="text-sm text-muted-foreground">Comparative mapping of current vs previous screening score metrics.</p>
                
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  {[
                    { label: "Symptoms Risk", val: result.symptomsScore, status: result.comparison.status },
                    { label: "Voice Instability", val: result.voiceScore, status: result.comparison.status },
                    { label: "Handwriting Distortion", val: result.handwritingScore, status: result.comparison.status },
                    { label: "Composite Risk", val: result.riskPercent, status: result.comparison.status }
                  ].map((x) => (
                    <div key={x.label} className="p-4 bg-card border border-border rounded-2xl flex flex-col justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">{x.label}</span>
                      <div className="flex justify-between items-baseline mt-4">
                        <div className="text-2xl font-black">{x.val}%</div>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border">
                          {getArrowIcon(x.status)}
                          {x.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Neurologist consultation advising */}
            {result.final_risk >= 80 && (
              <div className="border border-red-500/30 bg-red-500/10 rounded-3xl p-6 space-y-3">
                <h4 className="text-red-500 font-bold text-base flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" /> Strong Recommendation: Consult a Specialist
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your overall composite screening risk is elevated at <strong>{result.final_risk}%</strong>. We strongly recommend scheduling a comprehensive clinical consultation with a movement disorder specialist or board-certified neurologist.
                </p>
                <div className="pt-2 grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-card p-4 rounded-xl border border-border">
                    <span className="font-semibold text-muted-foreground uppercase">Recommended Specialists</span>
                    <p className="font-bold text-sm text-foreground mt-1">Nearby Movement Disorder Clinic</p>
                    <p className="text-muted-foreground mt-0.5">Location-based doctor mapping will be fully queryable in Phase 3.</p>
                  </div>
                  <div className="bg-card p-4 rounded-xl border border-border">
                    <span className="font-semibold text-muted-foreground uppercase">Emergency Contacts</span>
                    <p className="font-bold text-sm text-foreground mt-1">National Parkinson Helpline</p>
                    <p className="text-muted-foreground mt-0.5">1-800-473-4636 | Standard educational line.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Suggestions bullet lists */}
            <div className="glass rounded-3xl p-6 border border-border/50 space-y-4">
              <h4 className="font-display text-lg font-bold">Personalized Suggestions</h4>
              <ul className="space-y-3 text-sm">
                {result.voiceScore >= 50 && (
                  <li className="flex gap-3 text-muted-foreground">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Practice speech therapy:</strong> With elevated voice instability, practicing loud articulation, reading paragraphs aloud, and working on respiration pacing supports vocal cords.
                    </div>
                  </li>
                )}
                {result.handwritingScore >= 50 && (
                  <li className="flex gap-3 text-muted-foreground">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Perform hand exercises:</strong> Practice squeezing tennis balls, clay molding, and drawing trace lines daily to retain fine finger motor movements.
                    </div>
                  </li>
                )}
                {result.symptomsScore >= 50 && (
                  <li className="flex gap-3 text-muted-foreground">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Support baseline motor symptoms:</strong> Seek regular walking schedules, improve sleep patterns, set medication timers, and discuss physical therapy options.
                    </div>
                  </li>
                )}
                {result.final_risk < 50 && (
                  <li className="flex gap-3 text-muted-foreground">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                    <div>
                      <strong className="text-foreground">Normal screening thresholds:</strong> Continue moderate exercise routines, review healthy diets, and repeat assessments every 14 days to audit trends.
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* 6. AIChat and Navigation */}
            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
              <AIChat />
              <div className="glass rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-xl font-semibold">Clinical Action Items</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Review and download the generated clinical assessment report PDF to share with medical professionals.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3 pt-6 border-t border-border">
                  <Link 
                    to="/report" 
                    className="rounded-xl gradient-brand text-white px-5 py-2.5 font-semibold cursor-pointer text-center"
                  >
                    View Report
                  </Link>
                  <button 
                    onClick={() => { 
                      setResult(null); 
                      setStep(0); 
                      setMaxStepUnlocked(0);
                      setVoice(null); 
                      setHand(null);
                      setMri(null);
                      setVoiceResult(null); 
                      setHandResult(null);
                      setMriResult(null);
                    }} 
                    className="rounded-xl border border-border bg-card px-5 py-2.5 font-medium cursor-pointer hover:bg-muted transition-colors"
                  >
                    New Assessment
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ 
  step, 
  onStepClick 
}: { 
  step: number; 
  maxCompletedStep?: number; 
  onStepClick: (stepIndex: number) => void;
}) {
  const steps = ["Symptoms", "Voice", "Handwriting", "MRI"];
  return (
    <div className="mt-8 overflow-x-auto pb-1">
      <ol className="grid grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm min-w-[560px] sm:min-w-0">
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li 
              key={s} 
              onClick={() => onStepClick(i)}
              className={`rounded-xl p-3 sm:p-4 border transition-all duration-200 cursor-pointer hover:border-primary/50 ${
                active 
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm" 
                  : done 
                  ? "border-primary/30 bg-primary/5 text-foreground" 
                  : "border-border bg-card/50 text-muted-foreground opacity-80"
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-full text-xs sm:text-sm font-bold transition-all ${
                  done 
                    ? "gradient-brand text-white shadow-sm" 
                    : active 
                    ? "gradient-brand text-white shadow-md ring-2 ring-primary/40" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {done ? <Check className="h-4 w-4 stroke-[2.5]" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground">Step {i + 1}</div>
                  <div className="font-semibold leading-tight truncate">{s}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// WAV Encoder helper function (pure JavaScript)
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count (mono = 1) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate */
  view.setUint32(28, sampleRate * 2, true);
  /* block align */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);
  
  // Float32 to 16-bit PCM conversion
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([view], { type: "audio/wav" });
}

