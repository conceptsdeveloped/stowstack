import { useState, useEffect } from "react";
import { Download, Share, X, Smartphone } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, install } = usePWA();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("pwa-install-dismissed") === "true",
  );
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // On iOS Safari, we can't trigger native install prompt — show manual instructions
  const iosNeedsGuide = isIOS() && isSafari() && !isInstalled;

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Re-show prompt after 7 days
  useEffect(() => {
    const dismissedAt = localStorage.getItem("pwa-install-dismissed-at");
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) {
        localStorage.removeItem("pwa-install-dismissed");
        setDismissed(false);
      }
    }
  }, []);

  const handleDismiss = () => {
    dismiss();
    localStorage.setItem("pwa-install-dismissed-at", String(Date.now()));
  };

  if (isInstalled || dismissed) return null;
  if (!canInstall && !iosNeedsGuide) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-fade-up">
        <div className="bg-slate-900 rounded-xl p-4 shadow-2xl border border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">
                Install StowStack <span className="text-white/50 font-normal">by StorageAds.com</span>
              </p>
              <p className="text-xs text-white/60 mt-0.5">
                Get instant lead alerts, offline access, and quick actions from
                your home screen.
              </p>
              <div className="flex gap-2 mt-3">
                {canInstall ? (
                  <button
                    onClick={install}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    Install App
                  </button>
                ) : iosNeedsGuide ? (
                  <button
                    onClick={() => setShowIOSGuide(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <Share size={14} />
                    How to Install
                  </button>
                ) : null}
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-white/50 hover:text-white/80 text-xs transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari install guide modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Install StowStack
            </h3>
            <ol className="space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </span>
                <span>
                  Tap the{" "}
                  <Share size={14} className="inline text-blue-500 -mt-0.5" />{" "}
                  <strong>Share</strong> button in Safari's toolbar
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap{" "}
                  <strong>"Add to Home Screen"</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>"Add"</strong> — StowStack will appear as an app
                  on your home screen
                </span>
              </li>
            </ol>
            <button
              onClick={() => {
                setShowIOSGuide(false);
                handleDismiss();
              }}
              className="w-full mt-5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
