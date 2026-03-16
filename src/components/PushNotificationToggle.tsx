import { useState } from "react";
import { Bell, BellOff, BellRing, Loader2, Send } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

interface Props {
  adminKey: string;
  darkMode?: boolean;
}

export function PushNotificationToggle({ adminKey, darkMode }: Props) {
  const {
    pushSupported,
    pushSubscribed,
    pushPermission,
    pushLoading,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPush,
  } = usePWA();
  const [testSent, setTestSent] = useState(false);

  if (!pushSupported) return null;

  if (pushPermission === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs text-red-400">
        <BellOff size={14} />
        <span>
          Notifications blocked — enable in browser settings to receive lead
          alerts
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => {
          if (pushSubscribed) {
            unsubscribeFromPush(adminKey);
          } else {
            subscribeToPush(adminKey);
          }
        }}
        disabled={pushLoading}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          pushSubscribed
            ? darkMode
              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : darkMode
              ? "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        } disabled:opacity-50`}
      >
        {pushLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : pushSubscribed ? (
          <BellRing size={16} />
        ) : (
          <Bell size={16} />
        )}
        {pushLoading
          ? "Setting up..."
          : pushSubscribed
            ? "Push alerts on"
            : "Enable push alerts"}
      </button>
      {pushSubscribed && (
        <button
          onClick={async () => {
            await sendTestPush(adminKey);
            setTestSent(true);
            setTimeout(() => setTestSent(false), 3000);
          }}
          disabled={testSent}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            testSent
              ? "text-emerald-500"
              : darkMode
                ? "text-white/40 hover:text-white/70 hover:bg-white/5"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Send size={12} />
          {testSent ? "Sent!" : "Test"}
        </button>
      )}
    </div>
  );
}
