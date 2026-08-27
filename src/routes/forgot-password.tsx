import { api } from "@/lib/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, Brain } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — NeuroPark AI" },
      { name: "description", content: "Recover your patient profile password." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
      toast.success("Password reset instructions sent successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-aurora min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        
        <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30 mb-4">
            <Brain className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-2">Recover your patient monitoring profile password</p>
        </div>

        {sent ? (
          <div className="mt-8 text-center space-y-4">
            <div className="p-4 bg-green-500/10 text-green-600 rounded-xl border border-green-500/20 text-sm font-medium">
              We have sent password recovery instructions to: <br />
              <span className="font-bold text-foreground">{email}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Please check your spam/junk folder if you do not receive the email in a few minutes.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card/50 focus:bg-card focus:border-primary focus:outline-none transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl gradient-brand text-white py-3 font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending email...
                </>
              ) : (
                "Send Reset Instructions"
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
