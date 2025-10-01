"use client";

import { useEffect, useRef } from "react";

const useTradingViewWidget = (
  scriptUrl: string,
  config: Record<string, unknown>,
  height: number
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (containerRef.current.dataset.loaded) return; // If we have already loaded one widget
    containerRef.current.innerHTML = `<div class="tradingview-widget-container__widget" style="width: 100%; height: ${height}px;"></div>`; // We clear the innerHTML

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
    containerRef.current.dataset.loaded = "true"; // Mark as loaded

    // Clean it up on unmount of the function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        delete containerRef.current.dataset.loaded;
      }
    };
  }, [scriptUrl, config, height]);

  return containerRef;
};

export default useTradingViewWidget;
