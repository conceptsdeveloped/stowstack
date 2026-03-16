import { RefreshCw } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export function PWAUpdatePrompt() {
  const { needRefresh, dismissRefresh, updateServiceWorker } = usePWA();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
      <div className="glass-dark rounded-xl px-4 py-3 shadow-2xl border border-white/10 flex items-center gap-3">
        <RefreshCw size={16} className="text-emerald-400 shrink-0" />
        <p className="text-sm text-white/80">New version available</p>
        <button
          onClick={async () => {
            try {
              await updateServiceWorker(true);
            } catch {
              // Fallback: force reload if SW update fails
            }
            // Ensure page reloads even if updateServiceWorker doesn't trigger it
            setTimeout(() => window.location.reload(), 1000);
          }}
          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Update
        </button>
        <button
          onClick={dismissRefresh}
          className="text-white/40 hover:text-white/70 text-xs transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
