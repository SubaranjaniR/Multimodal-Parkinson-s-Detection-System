import { Link, useRouter } from "@tanstack/react-router";
import { Brain, Moon, Sun, Menu, X, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("np-theme") : null;
    const isDark = stored ? stored === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setDark(!!isDark);
    document.documentElement.classList.toggle("dark", !!isDark);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("np-token");
        const storedUser = localStorage.getItem("np-user");
        if (token && storedUser) {
          setIsLoggedIn(true);
          try {
            const u = JSON.parse(storedUser);
            setUserName(u.name || "Patient");
          } catch {
            setUserName("Patient");
          }
        } else {
          setIsLoggedIn(false);
          setUserName("");
        }
      }
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-change", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-change", checkAuth);
    };
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("np-theme", next ? "dark" : "light");
  };

  const handleLogout = () => {
    localStorage.removeItem("np-token");
    localStorage.removeItem("np-user");
    localStorage.removeItem("np-result");
    window.dispatchEvent(new Event("auth-change"));
    setOpen(false);
    router.navigate({ to: "/login" });
  };

  const activeLinks = isLoggedIn
    ? [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/predict", label: "New Prediction" },
        { to: "/history", label: "History" },
        { to: "/progress", label: "Progress" },
        { to: "/rewards", label: "Rewards" },
        { to: "/profile", label: "Profile" },
      ]
    : [
        { to: "/", label: "Home" },
        { to: "/login", label: "Login" },
        { to: "/signup", label: "Sign Up" },
        { to: "/about", label: "About" },
        { to: "/contact", label: "Contact" },
      ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
            <Brain className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Neuro<span className="gradient-text">Park</span> AI
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {activeLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:text-foreground hover:bg-muted transition-colors"
              activeProps={{ className: "text-foreground bg-muted font-semibold" }}
              activeOptions={{ exact: l.to === "/" || l.to === "/dashboard" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card hover:bg-muted transition-colors cursor-pointer"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link to="/profile" className="hidden sm:inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                <User className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-foreground max-w-[100px] truncate">{userName}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center rounded-lg gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Get Started
            </Link>
          )}

          <button onClick={() => setOpen(!open)} className="md:hidden grid h-9 w-9 place-items-center rounded-lg border border-border bg-card" aria-label="Menu">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
            {activeLinks.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted animate-[fade-in_0.2s_ease-out]">
                {l.label}
              </Link>
            ))}
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-muted flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="w-full text-center rounded-lg gradient-brand px-4 py-2 text-sm font-semibold text-white mt-2"
              >
                Get Started
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
