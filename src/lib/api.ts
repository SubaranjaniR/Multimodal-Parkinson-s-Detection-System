const baseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("np-token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function handleFetch(fetchCall: () => Promise<Response>, context: string): Promise<Response> {
  try {
    const res = await fetchCall();
    if (!res.ok) {
      let errMsg = `Request failed (${res.status} ${res.statusText})`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.detail) errMsg = errJson.detail;
      } catch { /* noop */ }
      console.error(`[API Error] ${context}:`, errMsg);
      throw new Error(errMsg);
    }
    return res;
  } catch (err: any) {
    if (err.message && (err.message.includes("Failed to fetch") || err.name === "TypeError")) {
      const msg = `Unable to connect to backend server at ${baseUrl}. Please ensure the Python FastAPI backend is running on port 8000.`;
      console.error(`[API Network Error] ${context}:`, err);
      throw new Error(msg);
    }
    throw err;
  }
}

async function jsonGet<T>(path: string): Promise<T> {
  const res = await handleFetch(() => fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: getHeaders(),
  }), `GET ${path}`);
  return res.json() as Promise<T>;
}

async function jsonPost<T>(path: string, body: unknown): Promise<T> {
  const res = await handleFetch(() => fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  }), `POST ${path}`);
  return res.json() as Promise<T>;
}

async function filePost<T>(path: string, file: File, fieldName = "file"): Promise<T> {
  const fd = new FormData();
  fd.append(fieldName, file);
  const res = await handleFetch(() => fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: fd,
  }), `POST (file) ${path}`);
  return res.json() as Promise<T>;
}

async function jsonDelete<T>(path: string): Promise<T> {
  const res = await handleFetch(() => fetch(`${baseUrl}${path}`, {
    method: "DELETE",
    headers: getHeaders(),
  }), `DELETE ${path}`);
  return res.json() as Promise<T>;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface SymptomsInput {
  age: number;
  gender: string;
  familyHistory: boolean;
  tremor: number;
  rigidity: number;
  bradykinesia: number;
  posturalInstability: number;
  speechProblems: number;
  sleepDisorders: number;
  updrs: number;
  moca: number;
  functionalAssessment: number;
}

export interface PredictionScore {
  score: number | null;
  prediction?: string | number | null;
  probability?: number | null;
  confidence?: number | null;
  status?: string;
  error?: string;
  filename?: string;
}

export interface FinalPrediction {
  id?: number;
  final_risk: number;
  prediction: string;
  riskPercent: number;
  symptomsScore: number;
  voiceScore: number;
  handwritingScore: number;
  featureImportance: { feature: string; value: number }[];
  rewards?: {
    pointsEarned: number;
    totalPoints: number;
    badge: string;
    message: string;
  };
  comparison?: {
    status: string;
    pct: number;
    prevRisk: number;
    currentRisk: number;
  };
}

export interface GroupedPeriodData {
  period: string;
  avgRisk: number;
}

export interface DashboardAnalytics {
  totalPredictions: number;
  latestRisk: number;
  averageRisk: number;
  highestRisk: number;
  lowestRisk: number;
  lastPredictionDate: string | null;
  riskTrend: "Increased" | "Decreased" | "Stable";
  grouped: {
    daily: GroupedPeriodData[];
    weekly: GroupedPeriodData[];
    monthly: GroupedPeriodData[];
  };
  distribution: {
    low: number;
    moderate: number;
    high: number;
  };
  latestContribution: {
    symptoms: number;
    voice: number;
    handwriting: number;
  };
}

export interface PredictionHistoryRecord {
  id: number;
  date: string;
  symptoms_score: number;
  voice_score: number;
  handwriting_score: number;
  final_risk: number;
  prediction: string;
  confidence: number;
  report_pdf_path: string;
  voice_path?: string | null;
  spiral_image_path?: string | null;
  symptoms_json?: string | null;
}

export interface ComparisonItem {
  prev: number;
  current: number;
  diff: number;
  status: "Improved" | "Stable" | "Declined";
  pct: number;
}

export interface ProgressData {
  comparison: {
    symptoms: ComparisonItem;
    voice: ComparisonItem;
    handwriting: ComparisonItem;
    risk: ComparisonItem;
  } | null;
  graph: {
    date: string;
    risk: number;
    voice: number;
    handwriting: number;
    symptoms: number;
  }[];
}

export interface RewardsData {
  totalPoints: number;
  activeBadge: "Bronze" | "Silver" | "Gold" | "Diamond";
  history: {
    points: number;
    badge: string | null;
    message: string | null;
    created_at: string;
  }[];
}

export interface MriPredictionResult {
  modality: string;
  prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
  explanation?: {
    method: string;
    heatmap: string;
    summary: string;
  };
  mri_filename?: string;
  status?: string;
  error?: string;
}

export const api = {
  signup: (data: any) => jsonPost<{ status: string; message: string }>("/auth/signup", data),
  login: (data: any) => jsonPost<{ access_token: string; token_type: string; user: User }>("/auth/login", data),
  getMe: () => jsonGet<User>("/auth/me"),
  forgotPassword: (email: string) => jsonPost<{ status: string; message: string }>("/auth/forgot-password", { email }),
  updateProfile: (data: { name: string; email: string }) => jsonPost<{ status: string; message: string; user: User }>("/auth/profile/update", data),
  changePassword: (data: any) => jsonPost<{ status: string; message: string }>("/auth/profile/change-password", data),
  deleteAccount: () => jsonDelete<{ status: string; message: string }>("/auth/profile/delete"),
  
  predictSymptoms: (data: SymptomsInput) => jsonPost<{ prediction: number; risk_score: number }>("/predict/symptoms", data),
  predictVoice: (file: File) => filePost<PredictionScore>("/predict/voice", file),
  predictHandwriting: (file: File) => filePost<PredictionScore>("/predict/handwriting", file),
  predictMri: (file: File) => filePost<MriPredictionResult>("/predict/mri", file),
  predictFinal: (data: { 
    symptoms: SymptomsInput; 
    voiceScore: number | null; 
    handwritingScore: number | null; 
    voiceFilename?: string | null; 
    handwritingFilename?: string | null;
    mriFilename?: string | null;
  }) =>
    jsonPost<FinalPrediction>("/predict/final", data),
    
  getAnalytics: () => jsonGet<DashboardAnalytics>("/analytics/dashboard"),
  deletePrediction: (id: number) => jsonDelete<{ status: string; message: string }>(`/predictions/${id}`),
    
  getHistory: (params?: { search?: string; filter_risk?: string; sort_by?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return jsonGet<PredictionHistoryRecord[]>(`/predictions/history?${q}`);
  },
  getProgress: () => jsonGet<ProgressData>("/predictions/progress"),
  getRewards: () => jsonGet<RewardsData>("/predictions/rewards"),
  
  downloadPreviousReport: async (id: number): Promise<Blob> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("np-token") : "";
    const res = await fetch(`${baseUrl}/predictions/report/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("Report not found");
    return res.blob();
  },

  getHandwritingImage: async (id: number): Promise<Blob> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("np-token") : "";
    const res = await fetch(`${baseUrl}/predictions/handwriting/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("Handwriting image not found");
    return res.blob();
  },

  getVoiceRecording: async (id: number): Promise<Blob> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("np-token") : "";
    const res = await fetch(`${baseUrl}/predictions/voice/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("Voice recording not found");
    return res.blob();
  },

  chat: (message: string, history: { role: string; content: string }[], result: { symptoms: SymptomsInput; result: FinalPrediction } | null) =>
    jsonPost<{ reply: string }>("/chat", { message, history, result }),
    
  getReport: async (id: string) => {
    const res = await fetch(`${baseUrl}/report?id=${id}`);
    if (!res.ok) throw new Error("Report not found");
    return res.json();
  },
  
  downloadReport: (data: { symptoms: SymptomsInput; result: FinalPrediction }) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("np-token") : "";
    return fetch(`${baseUrl}/report`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
  },
};

export function mockPrediction(input: SymptomsInput, voice: number, hand: number): FinalPrediction {
  const symScore = Math.min(100,
    (input.tremor + input.rigidity + input.bradykinesia + input.posturalInstability +
      input.speechProblems + input.sleepDisorders) * 3 +
    (input.familyHistory ? 8 : 0) +
    Math.max(0, input.age - 50) * 0.4
  );
  const risk = Math.round((symScore * 0.5 + voice * 0.25 + hand * 0.25));
  return {
    riskPercent: Math.min(99, Math.max(3, risk)),
    final_risk: Math.min(99, Math.max(3, risk)),
    prediction: risk >= 70 ? "High Risk" : (risk >= 30 ? "Moderate Risk" : "Low Risk"),
    symptomsScore: Math.round(symScore),
    voiceScore: Math.round(voice),
    handwritingScore: Math.round(hand),
    featureImportance: [
      { feature: "Tremor", value: input.tremor * 10 },
      { feature: "Voice Instability", value: voice },
      { feature: "Handwriting Distortion", value: hand },
      { feature: "Bradykinesia", value: input.bradykinesia * 10 },
      { feature: "Rigidity", value: input.rigidity * 10 },
      { feature: "Speech Problems", value: input.speechProblems * 10 },
      { feature: "Age", value: Math.max(0, input.age - 40) * 1.5 },
    ].sort((a, b) => b.value - a.value),
  };
}
