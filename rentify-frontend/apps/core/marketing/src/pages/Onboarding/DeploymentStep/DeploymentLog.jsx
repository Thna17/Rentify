import React, { useEffect, useRef } from 'react';

export default function DeploymentLog({ t, language, details = [] }) {
  const scrollRef = useRef(null);

  // Auto-scroll to latest log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [details.length]);

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return new Date().toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
    const date = new Date(timestamp);
    return isNaN(date.getTime())
      ? timestamp
      : date.toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
  };

  const getBadge = (type) => {
    switch (type) {
      case 'error':
        return <span className="font-semibold text-rose-400">[ERR]</span>;
      case 'warning':
        return <span className="font-semibold text-amber-400">[WRN]</span>;
      case 'success':
        return <span className="font-semibold text-emerald-400">[OK]</span>;
      default:
        return <span className="font-semibold text-sky-400">[INF]</span>;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-[#0b0f17] text-white shadow-xl ring-1 ring-white/10">
      {/* Console Window Header */}
      <div className="flex h-11 items-center justify-between border-b border-white/10 bg-white/[0.04] px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="ml-3 font-mono text-[12px] text-white/60">
            rentify-provision · live activity
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Live Stream
          </span>
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="max-h-56 min-h-36 overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed text-slate-300"
      >
        {details.length === 0 ? (
          <div className="flex items-center gap-2 text-white/40">
            <span className="inline-block h-3 w-1.5 animate-pulse bg-[#0071e3]" />
            <span>Initializing automated build pipeline…</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {details.map((detail, idx) => (
              <div key={detail.id || idx} className="flex items-start gap-2.5">
                <span className="shrink-0 text-[11px] text-white/35">
                  {formatTime(detail.timestamp)}
                </span>
                <span className="shrink-0 text-[11px]">
                  {getBadge(detail.type)}
                </span>
                <span className="break-words text-white/90">
                  {detail.message}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 text-white/40">
              <span className="inline-block h-3 w-1.5 animate-pulse bg-[#0071e3]" />
              <span className="text-[11px] text-white/50">Provisioning services…</span>
            </div>
          </div>
        )}
      </div>

      {/* Console Window Footer */}
      <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.02] px-4 py-2 text-[11px] text-white/40">
        <span>TLS Encrypted · Zero-Downtime Infrastructure</span>
        <span>{details.length} events logged</span>
      </div>
    </div>
  );
}
