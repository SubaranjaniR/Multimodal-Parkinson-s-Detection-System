import { Brain } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-white">
              <Brain className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold">NeuroPark AI</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Early Parkinson's Disease prediction using multimodal AI — symptoms, voice and handwriting.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About Parkinson's</Link></li>
            <li><Link to="/predict" className="hover:text-foreground">Prediction Dashboard</Link></li>
            <li><Link to="/report" className="hover:text-foreground">AI Report</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Medical Disclaimer</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            NeuroPark AI is a research-oriented predictive tool and is not a substitute for professional
            medical diagnosis. Always consult a qualified neurologist for clinical decisions.
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NeuroPark AI — Built for research & education.
      </div>
    </footer>
  );
}
