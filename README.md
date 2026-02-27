# Meridian v3 — Full Investment Platform

A fully client-side investment platform. No backend, no API key, no login.

## Features

### Signal Analysis
- **3 timeframes**: Scalp (intraday, 1h bars), Swing (daily), Long-term (weekly)
- **5 indicator families**: RSI, MACD, Bollinger Bands, EMA (200/100/50/25), Ichimoku Cloud
- **ATR & annualised volatility** charts
- **400-trial genetic optimiser** — finds optimal indicator weights for max backtested return
- **Risk profile slider** (Conservative → Speculative) — adjusts signal threshold and position sizing
- **Suggested stop-loss** based on ATR × risk multiplier
- **Suggested position size** (% of balance) per risk level
- **Fundamental data**: P/E, EPS, market cap, beta, dividend yield, 52-week range
- **MACD + RSI sub-charts**, volatility chart
- **Benchmark comparison** vs buy-and-hold

### Portfolio Tracker
- Add positions (symbol, shares, buy price, date, timeframe, risk level, notes)
- Live P&L per position and portfolio total
- **One-click signal refresh** — re-runs optimised analysis and updates signal status
- **Refresh All** button to batch-update all positions
- **Correlation matrix** heatmap across all held positions
- **Export to CSV**

### Watchlist
- Track symbols without holding them
- Bulk refresh signals for all watchlist items
- One-click "Analyse" jumps to full analysis view

### Dashboard
- Portfolio value, total P&L, active buy/sell alerts
- Recent signal overview

### Settings
- Default risk level, timeframe, data period, backtest balance
- All data stored in `localStorage` (persists across sessions)

---

## File Structure

```
meridian-v3/
├── index.html          ← App shell + all view HTML
├── netlify.toml        ← Netlify config
├── css/
│   └── style.css       ← Full stylesheet
└── js/
    ├── indicators.js   ← Data fetching + all technical indicators
    ├── optimiser.js    ← Signal builder, backtester, genetic optimiser
    ├── portfolio.js    ← localStorage persistence + analytics
    ├── charts.js       ← All Plotly chart renderers
    └── app.js          ← UI controller, routing, event handling
```

---

## Deploy to Netlify

**Option A: Netlify Drop (fastest)**
1. Go to https://app.netlify.com/drop
2. Drag & drop the `meridian-v3/` folder
3. Live instantly

**Option B: Git**
1. Push to GitHub
2. Connect repo in Netlify → deploy

---

## Run Locally

```bash
# Any static server works:
npx serve .
# or
python3 -m http.server 8080
# then open http://localhost:8080
```

> Opening `index.html` directly as a `file://` URL may cause CORS issues with the Yahoo Finance fetch.
> Use a local server instead.

---

## Disclaimer

For educational and informational purposes only. Not financial advice.
Backtested results are in-sample and subject to overfitting.
