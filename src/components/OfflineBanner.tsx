import { WifiOff } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export function OfflineBanner() {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2">
      <WifiOff size={14} />
      You are offline — some features may be limited. Form submissions will sync
      when you reconnect.
    </div>
  );
}
