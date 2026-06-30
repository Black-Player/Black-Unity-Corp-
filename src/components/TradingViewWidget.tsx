import React, { useEffect, useRef, memo } from 'react';

// Advanced TradingView Chart Widget
function TradingViewWidget({ symbol = "OANDA:EURUSD" }: { symbol?: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    // Clear existing content
    container.current.innerHTML = '';
    
    // Convert local symbols to TradingView symbols when possible
    let tvSymbol = symbol;
    if (symbol.startsWith('frx')) tvSymbol = "OANDA:" + symbol.replace('frx', '');
    else if (symbol.startsWith('cry')) tvSymbol = "BINANCE:" + symbol.replace('cry', '');
    // For synthetics without direct tv mappings, default or try derivations
    else if (symbol === 'R_100') tvSymbol = "DERIV:VOLATILITY100";
    else if (!tvSymbol.includes(':')) tvSymbol = "OANDA:" + tvSymbol; // Fallback
    
    const widgetId = 'tv_chart_' + Math.random().toString(36).substring(7);
    
    // Create the container element for TradingView
    const wrapperDiv = document.createElement('div');
    wrapperDiv.id = widgetId;
    wrapperDiv.className = "tradingview-widget-container__widget";
    wrapperDiv.style.height = "100%";
    wrapperDiv.style.width = "100%";
    container.current.appendChild(wrapperDiv);
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "${tvSymbol}",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "rgba(0, 0, 0, 1)",
        "gridColor": "rgba(255, 255, 255, 0.06)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "${widgetId}",
        "support_host": "https://www.tradingview.com"
      }
    `;
    container.current.appendChild(script);
    
    return () => {
      if (container.current) {
         container.current.innerHTML = '';
      }
    };
  }, [symbol]);

  return (
    <div className="tradingview-widget-container" style={{ height: "100%", width: "100%" }} ref={container}></div>
  );
}

export default memo(TradingViewWidget);
