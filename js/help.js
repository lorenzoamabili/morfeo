// ═══════════════════════════════════════════════════════════════
// MERIDIAN — help.js
// Static help content. All explanations written by Claude,
// hardcoded here. No API calls, no loading states, instant display.
// ═══════════════════════════════════════════════════════════════

const HELP_SECTIONS = [
  {
    id:         'overview',
    icon:       '◈',
    title:      'What is Meridian?',
    badge:      'Start Here',
    badgeColor: 'badge-gold',
    html: `
      <p class="help-para help-para-lead">Meridian is a stock analysis and portfolio tracking platform that runs entirely in your browser. There is no server, no account, and no subscription — you open it, type a ticker, and get a full technical analysis in seconds. All market data is fetched live from Yahoo Finance.</p>
      <p class="help-para">The core idea is that no single indicator is reliably right on its own. Meridian runs five different indicator families simultaneously — RSI, MACD, Bollinger Bands, EMA trend, and Ichimoku Cloud — then uses an optimiser to find the weight combination that would have worked best for that specific stock over the period you chose. The result is a single combined signal rather than five contradictory ones.</p>
      <p class="help-para">The basic workflow is: <strong>Analyse</strong> a stock to get a signal and see the charts, then <strong>Add to Portfolio</strong> to track your position with live P&L, or <strong>Add to Watchlist</strong> to monitor it without holding a position. You can refresh signals any time to see if anything has changed.</p>
      <p class="help-para">Meridian works for different trading styles. Scalp mode uses hourly bars and tight indicator windows for intraday traders. Swing mode uses daily bars for trades lasting days to weeks. Long-term mode uses weekly bars for buy-and-hold investors. Each mode automatically tunes the indicators to match the timeframe.</p>
    `,
  },
  {
    id:         'analysis',
    icon:       '⟁',
    title:      'Signal Analysis',
    badge:      'Core Feature',
    badgeColor: 'badge-buy',
    html: `
      <p class="help-para help-para-lead">To run an analysis, enter a ticker symbol (e.g. <strong>AAPL</strong>, <strong>TSLA</strong>, <strong>BTC-USD</strong>), choose a timeframe, set how many months of historical data to use, optionally enter a buy date if you already own the stock, and set your risk profile. Then click <strong>Run Analysis →</strong>.</p>
      <p class="help-para">Behind the scenes, Meridian fetches OHLCV data from Yahoo Finance, computes all five indicator families, then runs 400 optimisation trials to find the indicator weight combination that maximises backtested return for that stock and period. This takes a few seconds. The optimiser is doing real work — it's not just applying fixed rules.</p>
      <p class="help-para">The results show the <strong>optimised strategy return</strong> versus a simple buy-and-hold benchmark. If the strategy return is higher, the indicators found meaningful signal in the data. You'll also see win rate, number of trades, and max drawdown — the worst loss period the strategy experienced. Below the stats, the main chart shows buy signals as green triangles and sell signals as red triangles directly on the price line.</p>
      <p class="help-para">Once you have results, use the <strong>Add to Portfolio</strong> button to record your position, or <strong>Add to Watchlist</strong> to track the symbol without a position. The weight bars below the chart show which indicators the optimiser leaned on most heavily for this particular stock.</p>
    `,
  },
  {
    id:         'indicators',
    icon:       '〜',
    title:      'How Indicators Work',
    badge:      'Technical',
    badgeColor: 'badge-hold',
    html: `
      <p class="help-para help-para-lead">Meridian combines five indicator families into a single weighted signal. Rather than treating them equally, the optimiser finds which combination worked best historically for the specific stock you're analysing. Here's what each one measures.</p>
      <p class="help-para"><strong>RSI (Relative Strength Index)</strong> is a momentum oscillator that moves between 0 and 100. When RSI falls below 30, the stock is considered oversold — a potential buy zone. When it rises above 70, it's overbought — a potential sell zone. RSI is fast-moving and works well for spotting short-term exhaustion.</p>
      <p class="help-para"><strong>MACD (Moving Average Convergence Divergence)</strong> measures the relationship between two exponential moving averages. A positive signal line suggests upward momentum; a negative signal line suggests downward momentum. The histogram shows whether momentum is accelerating or fading — watch for the bars shrinking toward zero as a warning that a reversal may be coming.</p>
      <p class="help-para"><strong>Bollinger Bands</strong> are volatility envelopes drawn two standard deviations above and below a 20-day moving average. When price touches or breaks below the lower band, it's statistically stretched to the downside — a potential buy. When it touches the upper band, it may be stretched to the upside — a potential sell. Bands also widen during volatile periods and narrow during quiet ones.</p>
      <p class="help-para"><strong>EMA Trend</strong> uses four exponential moving averages (200, 100, 50, and 25-period). When price is above all four, the trend is clearly up. When it's below all four, the trend is clearly down. The 200-period EMA in particular is watched closely by institutional traders as a long-term trend dividing line. <strong>Ichimoku Cloud</strong> is a Japanese system that plots support/resistance zones as a shaded cloud. Price above the cloud signals a bullish regime; price below signals a bearish one. It provides context that the other indicators don't.</p>
    `,
  },
  {
    id:         'risk',
    icon:       '⚖',
    title:      'Risk Profile & Timeframes',
    badge:      'Important',
    badgeColor: 'badge-sell',
    html: `
      <p class="help-para help-para-lead">The <strong>timeframe</strong> selector changes the bar size and indicator windows used for the analysis. <strong>Scalp</strong> fetches 1-hour bars with short indicator periods, suited to intraday traders who open and close positions within a day. <strong>Swing</strong> uses daily bars with medium windows, suited to trades lasting a few days to a few weeks. <strong>Long-term</strong> uses weekly bars with longer windows, suited to investors holding for months or years. Switching timeframe also changes the default data period automatically.</p>
      <p class="help-para">The <strong>risk profile slider</strong> runs from Conservative (0) to Speculative (100) and controls how sensitive the strategy is to signals. At the conservative end, all five indicators must be broadly in agreement before a buy or sell signal is generated — this produces fewer trades but each one has stronger conviction. At the speculative end, even weak or partially-confirmed signals are acted on, producing more frequent trades with higher variance.</p>
      <p class="help-para">The risk level also directly sets two practical parameters shown in the results: the <strong>suggested stop-loss</strong>, calculated as a multiple of ATR (Average True Range), and the <strong>suggested position size</strong> as a percentage of your balance. Conservative settings suggest a wider stop and a smaller position. Speculative settings suggest a tighter stop and a larger allocation — reflecting the assumption that you're trading actively and sizing accordingly.</p>
      <p class="help-para">A sensible starting point: if you're new to technical analysis, use <strong>Swing + Conservative</strong> or <strong>Moderate</strong>. This gives you meaningful signals without overtrading. Active traders comfortable with volatility can try <strong>Scalp + Balanced</strong>. Long-term investors who check positions monthly should use <strong>Long-term + Conservative</strong> — the weekly bars filter out short-term noise entirely.</p>
    `,
  },
  {
    id:         'portfolio',
    icon:       '▣',
    title:      'Portfolio & Monitoring',
    badge:      'Monitoring',
    badgeColor: 'badge-gold',
    html: `
      <p class="help-para help-para-lead">After running an analysis, click <strong>Add to Portfolio</strong> to record a position. You'll be asked for the number of shares, the price you paid, the date of purchase, and optional notes. This data is saved in your browser's localStorage — it persists between sessions on the same device without any account or sync.</p>
      <p class="help-para">Each position card shows the current price, your average cost, total market value, and unrealised P&L in both dollar and percentage terms. The signal badge — <strong>BUY</strong>, <strong>SELL</strong>, <strong>HOLD</strong>, <strong>WATCH-BUY</strong>, or <strong>WATCH-SELL</strong> — shows the most recent signal for that position. The card border colour reflects this: green for buy, red for sell, blue for hold. To update a position's signal and price, click the <strong>↻</strong> refresh button on its card.</p>
      <p class="help-para">The <strong>Refresh All</strong> button re-runs analysis on every position in sequence and updates all signals and prices in one pass. This is useful as a morning routine — open the app, hit Refresh All, and get a current read on your whole book. When you have two or more positions with refreshed data, a <strong>correlation matrix</strong> appears below the grid showing how your holdings move relative to each other. High correlation between two positions means they tend to move together, which reduces diversification.</p>
      <p class="help-para">The <strong>Watchlist</strong> works the same way but without position sizes or P&L — it's for tracking symbols you're interested in but don't currently hold. Add symbols manually or from the Analysis view, then use <strong>Refresh Signals</strong> to batch-update all of them. Click <strong>Analyse</strong> on any watchlist row to jump straight to a full analysis of that symbol. Use <strong>Export CSV</strong> in the Portfolio view to download your full position history as a spreadsheet.</p>
    `,
  },
  {
    id:         'reading',
    icon:       '📊',
    title:      'Reading the Charts',
    badge:      'Charts',
    badgeColor: 'badge-hold',
    html: `
      <p class="help-para help-para-lead">The <strong>main price chart</strong> shows the closing price as a blue line. The <strong>red dotted line</strong> is the EMA 200 — the long-term trend anchor. When price is above it, the long-term trend is up; below it, down. The <strong>gold line</strong> is the EMA 25, a short-term trend guide. The shaded blue bands are <strong>Bollinger Bands</strong> — the upper and lower edges of normal price behaviour. Buy signals appear as <strong>▲ green triangles</strong> and sell signals as <strong>▽ red triangles</strong> directly on the price line. Brighter triangles indicate stronger signal conviction from the optimiser.</p>
      <p class="help-para">The <strong>MACD chart</strong> below the price shows momentum. The gold line is the MACD signal line — when it's above zero, momentum is bullish; below zero, bearish. The green and red bars are the histogram, showing the rate of change of momentum. Shrinking bars suggest the current trend is losing steam. A histogram crossing from negative to positive, combined with the signal line crossing above zero, is one of the cleaner MACD entry signals.</p>
      <p class="help-para">The <strong>RSI chart</strong> shows the momentum oscillator on a 0–100 scale. The green dotted line at 30 is the oversold zone — RSI dropping here suggests the stock has been sold hard and may be due for a bounce. The red dotted line at 70 is the overbought zone — RSI rising here suggests the stock has been bought aggressively and may be due for a pullback. RSI can stay in either zone for an extended time during strong trends, so treat it as context rather than a standalone trigger.</p>
      <p class="help-para">The <strong>key stats</strong> to focus on are: <strong>Optimised Return</strong> versus <strong>Buy &amp; Hold</strong> — if the strategy beats buy-and-hold, the indicators found genuine signal rather than noise. <strong>Win Rate</strong> tells you what percentage of individual trades were profitable. <strong>Max Drawdown</strong> is the largest peak-to-trough loss the strategy experienced — this is the number to check against your own risk tolerance before acting on any signal. A strategy with 40% return and 35% drawdown may not be worth it; one with 25% return and 8% drawdown probably is.</p>
    `,
  },
];

// ── Help Modal State ──────────────────────────────────────────────

let helpState = {
  isOpen:        false,
  activeSection: 0,
};

// ── Open / Close ──────────────────────────────────────────────────

function openHelp(sectionId) {
  const idx = sectionId
    ? HELP_SECTIONS.findIndex(s => s.id === sectionId)
    : 0;

  helpState.isOpen        = true;
  helpState.activeSection = Math.max(0, idx);

  document.getElementById('helpModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  renderHelpNav();
  showHelpSection(helpState.activeSection);
}

function closeHelp() {
  helpState.isOpen = false;
  document.getElementById('helpModal').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('click', e => {
  if (e.target.id === 'helpModal') closeHelp();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && helpState.isOpen) closeHelp();
});

// ── Nav ───────────────────────────────────────────────────────────

function renderHelpNav() {
  document.getElementById('helpNav').innerHTML = HELP_SECTIONS.map((s, i) => `
    <button
      class="help-nav-btn ${i === helpState.activeSection ? 'active' : ''}"
      onclick="showHelpSection(${i})"
    >
      <span class="help-nav-icon">${s.icon}</span>
      <span>${s.title}</span>
    </button>
  `).join('');
}

// ── Show section — instant, no loading ───────────────────────────

function showHelpSection(idx) {
  helpState.activeSection = idx;
  const section = HELP_SECTIONS[idx];

  document.querySelectorAll('.help-nav-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });

  document.getElementById('helpSectionTitle').textContent = section.title;
  const badge = document.getElementById('helpSectionBadge');
  badge.textContent = section.badge;
  badge.className   = `badge ${section.badgeColor}`;

  const content = document.getElementById('helpContent');
  content.style.opacity = '0';
  setTimeout(() => {
    content.innerHTML     = section.html;
    content.style.opacity = '1';
  }, 80);
}

// ── Context-aware open ────────────────────────────────────────────

function openContextHelp() {
  const viewMap = {
    dashboard: 'overview',
    analysis:  'analysis',
    portfolio: 'portfolio',
    watchlist: 'portfolio',
    settings:  'overview',
  };
  openHelp(viewMap[window.state?.currentView] || 'overview');
}
