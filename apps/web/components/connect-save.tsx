"use client";

import React, { useEffect, useState } from "react";
import { useRecommendation } from "@/lib/recommendation-context";

export function ConnectSave() {
  const { status, error, connect, demo, watch } = useRecommendation();
  const [supportsLiveWatch, setSupportsLiveWatch] = useState(false);

  useEffect(() => {
    setSupportsLiveWatch("showOpenFilePicker" in window);
  }, []);

  const isLoading = status === "loading";

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-surface border border-line rounded-lg p-6 flex flex-col gap-5">
        {/* Title */}
        <div>
          <h2 className="font-display font-semibold text-[20px] text-text tracking-[-0.01em]">
            Conecte seu save
          </h2>
          <p className="text-[13px] text-dim mt-1 font-body">
            Leia seu save localmente — nada sai do browser.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => void connect()}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-md bg-gold text-bg font-display font-semibold text-[14px] hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isLoading ? "Carregando..." : "Conectar save"}
          </button>

          <button
            onClick={() => void demo()}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-md bg-surface-2 border border-line text-text font-body font-medium text-[14px] hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            Demo
          </button>

          <button
            onClick={() => void watch()}
            disabled={isLoading || !supportsLiveWatch}
            title={
              !supportsLiveWatch
                ? "Requer Chrome ou Edge com File System Access API"
                : "Monitorar o save em tempo real"
            }
            className="w-full py-2.5 px-4 rounded-md bg-surface-2 border border-line text-dim font-body font-medium text-[14px] hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Live-watch
            {!supportsLiveWatch && (
              <span className="ml-2 text-[11px] text-dim/60">(Chrome/Edge)</span>
            )}
          </button>
        </div>

        {/* Save path hint */}
        <div className="bg-bg rounded px-3 py-2.5 border border-line/60">
          <p className="text-[12px] text-dim font-mono leading-relaxed">
            SaveFile_Live.es3
          </p>
          <p className="text-[11px] text-dim/60 font-body mt-0.5">
            AppData\LocalLow\TesseractStudio\TaskbarHero
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded px-3 py-2.5 bg-coral/10 border border-coral/30">
            <p className="text-[13px] text-coral font-body leading-snug">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
