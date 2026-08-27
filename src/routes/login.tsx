import { api } from "@/lib/api";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Sparkles, Brain, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — NeuroPark AI" },
      { name: "description", content: "Access your personalized patient dashboard and tracking metrics." },
    ],
  }),
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("np-token");
    if (token) {
      router.navigate({ to: "/dashboard" });
    }
    
    // Fill in remembered email
    const rem = localStorage.getItem("np-remember-email");
    if (rem) {
      setEmail(rem);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      
      // Store credentials
      localStorage.setItem("np-token", res.access_token);
      localStorage.setItem("np-user", JSON.stringify(res.user));
      
      if (rememberMe) {
        localStorage.setItem("np-remember-email", email);
      } else {
        localStorage.removeItem("np-remember-email");
      }
      
      // Dispatch auth change event to update Navbar
      window.dispatchEvent(new Event("auth-change"));
      
      toast.success(`Welcome back, ${res.user.name}!`);
      router.navigate({ to: "/dashboard" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to login. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-aurora min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30 mb-4 animate-float">
            <Brain className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Patient Login</h1>
          <p className="text-sm text-muted-foreground mt-2">Access your neurological assessment dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-4">
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

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card/50 focus:bg-card focus:border-primary focus:outline-none transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center h-8 w-8"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl gradient-brand text-white py-3 font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}
