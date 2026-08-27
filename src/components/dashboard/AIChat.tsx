import { useState } from "react";
import { Bot, Send, User } from "lucide-react";

import { api } from "@/lib/api";

interface Msg { role: "user" | "assistant"; content: string; }

export function AIChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your NeuroPark AI Health Assistant. Ask me anything about your results." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setLoading(true);
    
    // Retrieve prediction results as context
    let sessionContext = null;
    try {
      const raw = sessionStorage.getItem("np-result");
      if (raw) sessionContext = JSON.parse(raw);
    } catch {
      /* noop */
    }

    try {
      const res = await api.chat(text, messages, sessionContext);
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages([...next, { 
        role: "assistant", 
        content: "I'm having trouble communicating with the AI health assistant. Please ensure the backend server is running." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl flex flex-col h-[520px]">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg gradient-brand text-white"><Bot className="h-4 w-4" /></span>
        <div>
          <div className="font-semibold leading-tight">AI Health Assistant</div>
          <div className="text-xs text-muted-foreground">Educational guidance only</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full gradient-brand text-white"><Bot className="h-3.5 w-3.5" /></span>}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed
              ${m.role === "user" ? "gradient-brand text-white" : "bg-card border border-border"}`}>
              {m.content}
            </div>
            {m.role === "user" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted"><User className="h-3.5 w-3.5" /></span>}
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground animate-pulse">Assistant is thinking…</div>}
      </div>
      <div className="border-t border-border p-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {["Why am I high risk?", "What exercises are recommended?", "Should I consult a doctor?"].map((p) => (
            <button key={p} onClick={() => send(p)} className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted">{p}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI assistant…"
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2 text-sm" />
          <button type="submit" className="grid h-10 w-10 place-items-center rounded-xl gradient-brand text-white">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
