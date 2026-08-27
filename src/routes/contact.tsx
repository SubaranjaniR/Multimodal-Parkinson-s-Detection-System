import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — NeuroPark AI" },
      { name: "description", content: "Get in touch with the NeuroPark AI team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    toast.success("Message sent — we'll get back to you soon.");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="bg-aurora">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 grid lg:grid-cols-[1fr_1.2fr] gap-10">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Contact</div>
          <h1 className="mt-2 font-display text-4xl font-bold">Let's talk healthcare AI</h1>
          <p className="mt-4 text-muted-foreground">
            Questions about the model, partnerships, or research collaboration? Send us a note.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Mail, l: "Email", v: "hello@neuropark.ai" },
              { icon: Phone, l: "Phone", v: "+1 (555) 010-2468" },
              { icon: MapPin, l: "Lab", v: "Boston, MA · Bangalore, IN" },
            ].map((c) => (
              <li key={c.l} className="flex items-center gap-4 glass rounded-xl p-4">
                <span className="grid h-10 w-10 place-items-center rounded-lg gradient-brand text-white">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.l}</div>
                  <div className="font-semibold">{c.v}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="glass rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name"><input required className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></Field>
            <Field label="Email"><input required type="email" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></Field>
          </div>
          <Field label="Subject"><input required className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></Field>
          <Field label="Message"><textarea required rows={6} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" /></Field>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl gradient-brand text-white px-6 py-3 font-semibold shadow-lg shadow-primary/30 disabled:opacity-60">
            <Send className="h-4 w-4" /> {loading ? "Sending…" : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
