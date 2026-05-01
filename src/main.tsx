import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { seedDefaultPresets } from "./lib/blendshape-defaults";

// Seed built-in blendshape presets on first run
seedDefaultPresets();

createRoot(document.getElementById("root")!).render(<App />);

// ── Web Vitals reporting (Req 30.3) ──────────────────────────────────────────
// Log LCP, FID, CLS when page load completes.
// Uses dynamic import so web-vitals does not block initial render.
import('web-vitals').then(({ onLCP, onINP, onCLS }) => {
  const logVital = (metric: { name: string; value: number; rating: string }) => {
    console.info(`[WebVitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
    // Forward to analytics if available (e.g. window.gtag, window.analytics, etc.)
    // Replace the console.info call below with your analytics integration as needed.
  };

  onLCP(logVital);
  onINP(logVital); // INP replaced FID in web-vitals v4+
  onCLS(logVital);
}).catch(() => {
  // web-vitals failed to load — non-critical, silently ignore
});
