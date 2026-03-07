// ═══════════════════════════════════════════════════════════════
// MORFEO v3 — app.js
// UI controller, view routing, event handling
// ═══════════════════════════════════════════════════════════════

// ── App state ────────────────────────────────────────────────────
const state = {
  currentView: 'analysis',
  analysisResult: null,   // last analysis data
  portfolio: [],
  watchlist: [],
  settings: null,
  portfolioCache: {},     // symbol → { data, ind, net, result }
};

// ── Init ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  state.settings = loadSettings();
  state.portfolio = loadPortfolio();
  state.watchlist = loadWatchlist();

  initNav();
  initAnalysisView();
  renderDashboard();
  renderPortfolioView();
  renderWatchlistView();
  renderSettingsView();
  updatePortfolioBadge();
  updateWatchlistBadge();
  startClock();

  // Mobile menu
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
});

// ── Navigation ────────────────────────────────────────────────────

function initNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.view;
      if (view) switchView(view);
      document.getElementById('sidebar').classList.remove('open');
    });
  });
}

function switchView(name) {
  state.currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === name);
  });
  const titles = {
    dashboard: 'Dashboard',
    analysis: 'Signal Analysis',
    portfolio: 'Portfolio',
    watchlist: 'Watchlist',
    settings: 'Settings',
  };
  document.getElementById('topbarTitle').textContent = titles[name] || 'Morfeo';

  // Refresh views on switch
  if (name === 'dashboard') renderDashboard();
  if (name === 'portfolio') renderPortfolioView();
  if (name === 'watchlist') renderWatchlistView();
}

// ── Clock ─────────────────────────────────────────────────────────

function startClock() {
  function tick() {
    const el = document.getElementById('topbarTime');
    if (el) el.textContent = new Date().toUTCString().replace('GMT', 'UTC').substring(0, 25);
  }
  tick();
  setInterval(tick, 1000);
}

// ══════════════════════════════════════════════════════════════════
// ANALYSIS VIEW
// ══════════════════════════════════════════════════════════════════

function initAnalysisView() {
  const s = state.settings;

  // Populate defaults
  document.getElementById('aMonths').value = s.defaultPeriod;
  document.getElementById('aRiskSlider').value = s.defaultRisk;
  updateRiskLabel(s.defaultRisk);

  // Timeframe segment — clear all first, then set correct default
  document.querySelectorAll('#tfSegment .seg-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tfSegment .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tf = btn.dataset.tf;
      document.getElementById('aMonths').value = timeframeDefaultPeriod(tf);
    });
  });
  // Set correct default (fall back to 'swing' if not found)
  const defaultBtn = document.querySelector(`#tfSegment [data-tf="${s.defaultTimeframe}"]`)
    || document.querySelector('#tfSegment [data-tf="swing"]');
  if (defaultBtn) defaultBtn.classList.add('active');

  // Risk slider
  document.getElementById('aRiskSlider')?.addEventListener('input', e => {
    updateRiskLabel(parseInt(e.target.value));
  });

  // Buy date default
  const today = new Date().toISOString().split('T')[0];
  const buyInput = document.getElementById('aBuyDate');
  if (buyInput) { buyInput.value = today; buyInput.max = today; }

  // Enter key + ticker autocomplete
  setupTickerAutocomplete();
}

// ── Ticker autocomplete ───────────────────────────────────────────

function setupTickerAutocomplete() {
  const input = document.getElementById('aSymbol');
  const dropdown = document.getElementById('aSymbolDropdown');
  if (!input || !dropdown) return;

  let debounceTimer = null;
  let activeIdx = -1;

  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('.ticker-item');
    if (e.key === 'Enter') {
      if (activeIdx >= 0 && items[activeIdx]) {
        items[activeIdx].click();
      } else {
        hideTickerDropdown();
        runAnalysis();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('ticker-item-active', i === activeIdx));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, -1);
      items.forEach((el, i) => el.classList.toggle('ticker-item-active', i === activeIdx));
      return;
    }
    if (e.key === 'Escape') { hideTickerDropdown(); return; }
  });

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(debounceTimer);
    activeIdx = -1;
    if (q.length < 2) { hideTickerDropdown(); return; }
    debounceTimer = setTimeout(() => fetchTickerSuggestions(q), 380);
  });

  input.addEventListener('blur', () => {
    setTimeout(hideTickerDropdown, 200);
  });
}

async function fetchTickerSuggestions(query) {
  const dropdown = document.getElementById('aSymbolDropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '<div class="ticker-searching">Searching…</div>';
  dropdown.style.display = 'block';
  try {
    const results = await searchYahooTickers(query);
    renderTickerDropdown(results);
  } catch (e) {
    hideTickerDropdown();
  }
}

function renderTickerDropdown(results) {
  const dropdown = document.getElementById('aSymbolDropdown');
  if (!dropdown) return;
  if (!results.length) {
    dropdown.innerHTML = '<div class="ticker-searching">No results found</div>';
    return;
  }
  const typeLabel = { EQUITY: 'Stock', ETF: 'ETF', MUTUALFUND: 'Fund', CRYPTOCURRENCY: 'Crypto', INDEX: 'Index', FUTURE: 'Future' };
  dropdown.innerHTML = results.map(r => {
    const name = r.shortname || r.longname || '';
    const exch = r.exchange || '';
    const type = typeLabel[r.quoteType] || r.quoteType || '';
    return `
      <div class="ticker-item" onclick="selectTicker('${r.symbol}')">
        <span class="ticker-item-symbol">${r.symbol}</span>
        <span class="ticker-item-name">${name}</span>
        <span class="ticker-item-meta">${[exch, type].filter(Boolean).join(' · ')}</span>
      </div>`;
  }).join('');
  dropdown.style.display = 'block';
}

function selectTicker(symbol) {
  const input = document.getElementById('aSymbol');
  if (input) input.value = symbol;
  hideTickerDropdown();
}

function hideTickerDropdown() {
  const dropdown = document.getElementById('aSymbolDropdown');
  if (dropdown) dropdown.style.display = 'none';
}

function updateRiskLabel(val) {
  const profile = riskProfile(val);
  const el = document.getElementById('aRiskLabel');
  if (el) {
    el.textContent = profile.label;
    el.style.color = profile.color;
  }
  const descEl = document.getElementById('aRiskDesc');
  if (descEl) descEl.textContent = profile.desc;
}

function getActiveTimeframe() {
  const active = document.querySelector('#tfSegment .seg-btn.active');
  return active ? active.dataset.tf : 'swing';
}

async function runAnalysis() {
  const symbol = document.getElementById('aSymbol').value.trim().toUpperCase();
  const months = parseInt(document.getElementById('aMonths').value) || 6;
  const rawDate = document.getElementById('aBuyDate').value;
  const riskVal = parseInt(document.getElementById('aRiskSlider').value);
  const tf = getActiveTimeframe();
  const riskLvl = riskVal / 100;

  // Weekend check
  const buyDate = rawDate ? adjustWeekend(rawDate) : null;
  const weekendEl = document.getElementById('aWeekendWarn');
  if (rawDate && buyDate !== rawDate) {
    weekendEl.textContent = `Weekend adjusted → ${buyDate}`;
    weekendEl.style.display = 'block';
  } else {
    weekendEl.style.display = 'none';
  }

  if (!symbol) { showAlert('aAlert', 'error', 'Please enter a ticker symbol.'); return; }

  const btn = document.getElementById('aRunBtn');
  btn.disabled = true;
  hideAlert('aAlert');
  document.getElementById('aResults').style.display = 'none';
  setLoadingSteps('aLoading', true);
  setStep('aLoading', 1);

  try {
    // ── Fetch data ──
    const now = Math.floor(Date.now() / 1000);
    const startDt = new Date();
    startDt.setMonth(startDt.getMonth() - months);
    const period1 = Math.floor(startDt.getTime() / 1000);
    const interval = timeframeInterval(tf);

    const data = await fetchYahooOHLCV(symbol, period1, now, interval);
    setStep('aLoading', 2);

    // ── Fetch fundamentals in parallel ──
    const fundsPromise = fetchFundamentals(symbol);

    // ── Indicators ──
    const config = timeframeConfig(tf);
    const ind = buildIndicators(data, config);
    setStep('aLoading', 3);

    // ── Optimise ──
    const buyDayIdx = buyDate ? (data.dates.findIndex(d => d >= buyDate) ?? -1) : -1;
    const slPct = suggestStopLoss(data.close, ind.atr, riskLvl) / 100;
    const posSzPct = suggestPositionSize(riskLvl) / 100;

    const { bestWeights, bestSignal, bestProfit } = await optimise(data.close, ind, {
      nTrials: 400,
      buyDayIdx,
      riskLevel: riskLvl,
      backtestOpts: { stopLossPct: slPct, positionSizePct: posSzPct },
    });

    setStep('aLoading', 4);

    // ── Final backtest ──
    const result = backtest(data.close, bestSignal, {
      riskLevel: riskLvl,
      stopLossPct: slPct,
      takeProfitPct: null,
      positionSizePct: posSzPct,
      initialBalance: state.settings.initialBalance,
    });

    const bah = buyAndHold(data.close, state.settings.initialBalance);
    const lastRSI = ind.rsi.filter(v => v != null).pop();
    const signal = currentSignal(bestSignal, lastRSI, riskLvl);
    const funds = await fundsPromise;

    // Cache for later portfolio use
    state.analysisResult = { data, ind, net: bestSignal, result, bah, signal, funds, riskLvl, tf, bestWeights, symbol };
    state.portfolioCache[symbol] = state.analysisResult;

    setLoadingSteps('aLoading', false);

    // ── Render results ──
    renderAnalysisResults(state.analysisResult, buyDate);

  } catch (err) {
    setLoadingSteps('aLoading', false);
    showAlert('aAlert', 'error', err.message || 'Analysis failed.');
  } finally {
    btn.disabled = false;
  }
}

function renderAnalysisResults(r, buyDate) {
  const { data, ind, net, result, bah, signal, funds, riskLvl, tf, bestWeights, symbol } = r;

  const resEl = document.getElementById('aResults');
  resEl.style.display = 'block';

  // Header
  document.getElementById('aResTicker').textContent = symbol;
  document.getElementById('aResName').textContent = data.name !== symbol ? data.name : '';
  document.getElementById('aResExchange').textContent = data.exchange;

  // Signal badge
  const sigEl = document.getElementById('aResSignal');
  sigEl.textContent = signal;
  sigEl.className = 'badge ' + signalBadgeClass(signal);

  // Stats
  const profitEl = document.getElementById('aResProfit');
  profitEl.textContent = fmtPct(result.profitPct);
  profitEl.className = 'stat-value ' + (result.profitPct >= 0 ? 'pos' : 'neg');

  document.getElementById('aResBah').textContent = fmtPct(bah);
  document.getElementById('aResWinRate').textContent = result.numTrades ? `${result.winRate}%` : '—';
  document.getElementById('aResWinRate2').textContent = result.numTrades ? `${result.winRate}%` : '—';
  document.getElementById('aResDrawdown').textContent = result.maxDrawdownPct > 0 ? `-${result.maxDrawdownPct}%` : '—';
  document.getElementById('aResTrades').textContent = result.numTrades;

  const lastPrice = data.close[data.close.length - 1];
  document.getElementById('aResPrice').textContent = `${data.currency} ${lastPrice.toFixed(2)}`;

  const atrLast = ind.atr.filter(v => v != null).pop();
  const slSugg = suggestStopLoss(data.close, ind.atr, riskLvl);
  const posSugg = suggestPositionSize(riskLvl);
  document.getElementById('aResStopLoss').textContent = `${slSugg}%  (${(lastPrice * slSugg / 100).toFixed(2)})`;
  document.getElementById('aResPosSize').textContent = `${posSugg}% of balance`;

  const lastVol = ind.vol.filter(v => v != null).pop();
  document.getElementById('aResVol').textContent = lastVol ? `${lastVol.toFixed(1)}%` : '—';
  document.getElementById('aResATR').textContent = atrLast ? `${atrLast.toFixed(2)} (${(atrLast / lastPrice * 100).toFixed(1)}%)` : '—';

  // Fundamentals
  if (funds) {
    document.getElementById('aFundPE').textContent = funds.pe;
    document.getElementById('aFundFwdPE').textContent = funds.forwardPE;
    document.getElementById('aFundEPS').textContent = funds.eps;
    document.getElementById('aFundMktCap').textContent = funds.marketCap;
    document.getElementById('aFundBeta').textContent = funds.beta;
    document.getElementById('aFundDivYield').textContent = funds.dividendYield;
    document.getElementById('aFund52H').textContent = funds.fiftyTwoHigh;
    document.getElementById('aFund52L').textContent = funds.fiftyTwoLow;
    document.getElementById('aFundAvgVol').textContent = funds.avgVolume;
    document.getElementById('aFundamentals').style.display = 'block';
  } else {
    document.getElementById('aFundamentals').style.display = 'none';
  }

  // Weights
  renderWeightBars('aWeights', bestWeights);

  // Charts
  renderAnalysisChart('aChartMain', data, ind, net, { buyDateStr: buyDate });
  renderMACDChart('aChartMACD', data, ind);
  renderRSIChart('aChartRSI', data, ind);
  renderVolatilityChart('aChartVol', data.dates, ind.vol, ind.atr, data.close);

  // Add to portfolio / watchlist buttons
  document.getElementById('aBtnAddPortfolio').onclick = () => openAddPositionModal(r);
  document.getElementById('aBtnAddWatchlist').onclick = () => {
    addToWatchlist(symbol, data.name);
    state.watchlist = loadWatchlist();
    showToast(`${symbol} added to watchlist`);
    updateWatchlistBadge();
  };

  resEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderWeightBars(containerId, weights) {
  const labels = { rsiW: 'RSI', trendW: 'EMA Trend', macdW: 'MACD', bollW: 'Bollinger', ichiW: 'Ichimoku' };
  const container = document.getElementById(containerId);
  if (!container) return;

  const maxAbs = Math.max(...Object.values(weights).map(Math.abs));
  container.innerHTML = Object.entries(weights).map(([k, v]) => {
    const pct = maxAbs > 0 ? Math.abs(v) / maxAbs * 100 : 0;
    const sign = v >= 0 ? '+' : '';
    return `
      <div class="weight-row">
        <div class="weight-name">${labels[k] || k}</div>
        <div class="weight-bar-bg"><div class="weight-bar-fill" style="width:${pct}%"></div></div>
        <div class="weight-pct">${sign}${(v * 100).toFixed(0)}%</div>
      </div>`;
  }).join('');
}

// ── Add position modal ────────────────────────────────────────────

function openAddPositionModal(r) {
  const { data, signal, riskLvl, tf } = r;
  const lastPrice = data.close[data.close.length - 1];
  document.getElementById('modalSymbol').textContent = data.symbol;
  document.getElementById('modalPrice').value = lastPrice.toFixed(2);
  document.getElementById('modalDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('modalShares').value = '';
  document.getElementById('modalRisk').value = Math.round(riskLvl * 100);
  document.getElementById('modalTf').value = tf;
  document.getElementById('modalNotes').value = '';

  // Show cost estimate on share change
  const sharesEl = document.getElementById('modalShares');
  const costEl = document.getElementById('modalCost');
  sharesEl.oninput = () => {
    const cost = parseFloat(sharesEl.value) * lastPrice;
    costEl.textContent = isNaN(cost) ? '' : `Cost: ${fmtCurrency(cost, data.currency)}`;
  };

  document.getElementById('positionModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('positionModal').style.display = 'none';
}

function savePosition() {
  const symbol = document.getElementById('modalSymbol').textContent;
  const shares = parseFloat(document.getElementById('modalShares').value);
  const buyPrice = parseFloat(document.getElementById('modalPrice').value);
  const buyDate = document.getElementById('modalDate').value;
  const riskLevel = parseInt(document.getElementById('modalRisk').value);
  const tf = document.getElementById('modalTf').value;
  const notes = document.getElementById('modalNotes').value;

  if (!shares || shares <= 0 || !buyPrice || buyPrice <= 0) {
    showToast('Please enter valid shares and price.', 'error');
    return;
  }

  const cached = state.portfolioCache[symbol] || null;
  const name = cached?.data?.name || symbol;

  upsertPosition({ symbol, name, shares, buyPrice, buyDate, notes, timeframe: tf, riskLevel });
  state.portfolio = loadPortfolio();

  // Pre-fill live data if we have it cached
  if (cached) {
    const lastPrice = cached.data.close[cached.data.close.length - 1];
    updatePositionLiveData(symbol, {
      currentPrice: lastPrice,
      lastSignal: cached.signal,
      fundamentals: cached.funds,
    });
    state.portfolio = loadPortfolio();
  }

  closeModal();
  showToast(`${symbol} added to portfolio`);
  updatePortfolioBadge();
  renderPortfolioView();
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ══════════════════════════════════════════════════════════════════

function renderDashboard() {
  state.portfolio = loadPortfolio();
  state.watchlist = loadWatchlist();

  const summary = portfolioSummary(state.portfolio);
  const currency = state.settings?.currency || 'USD';

  document.getElementById('dTotalValue').textContent = fmtCurrency(summary.totalValue || 0, currency);
  document.getElementById('dTotalPnL').textContent = fmtPct(summary.totalPnLPct);
  document.getElementById('dTotalPnL').className = 'stat-value ' + (summary.totalPnLPct >= 0 ? 'pos' : 'neg');
  document.getElementById('dPositions').textContent = summary.positions;
  document.getElementById('dBuys').textContent = summary.buys;
  document.getElementById('dSells').textContent = summary.sells;
  document.getElementById('dWatchlist').textContent = state.watchlist.length;

  // Recent signals
  const signalEl = document.getElementById('dSignalList');
  const allPos = [...state.portfolio].filter(p => p.lastSignal);
  const alertPos = allPos.filter(p => p.lastSignal === 'BUY' || p.lastSignal === 'SELL');

  if (alertPos.length === 0) {
    signalEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📡</div><div>No active signals. Run analysis on your positions to populate.</div></div>`;
  } else {
    signalEl.innerHTML = alertPos.slice(0, 8).map(p => `
      <div class="flex items-center justify-between" style="padding:10px 0; border-bottom:1px solid var(--border);">
        <div>
          <span class="font-serif" style="font-size:15px; font-weight:700;">${p.symbol}</span>
          <span class="text-muted text-xs" style="margin-left:8px;">${p.name}</span>
        </div>
        <div class="flex gap-8 items-center">
          <span class="text-xs text-muted">${p.currentPrice ? fmtCurrency(p.currentPrice) : '—'}</span>
          <span class="badge ${signalBadgeClass(p.lastSignal)}">${p.lastSignal}</span>
        </div>
      </div>`).join('');
  }

  // Portfolio positions mini-list
  const posListEl = document.getElementById('dPosList');
  if (state.portfolio.length === 0) {
    posListEl.innerHTML = `<div class="empty-state"><div class="empty-icon">💼</div><div class="empty-title">Portfolio is empty</div><div>Analyse a stock then click "Add to Portfolio"</div></div>`;
  } else {
    posListEl.innerHTML = state.portfolio.slice(0, 6).map(p => {
      const { pnl, pnlPct } = positionPnL(p);
      return `
        <div class="flex items-center justify-between" style="padding:9px 0; border-bottom:1px solid var(--border);">
          <div>
            <span style="font-weight:500; font-size:12px;">${p.symbol}</span>
            <span class="text-muted text-xs" style="margin-left:6px;">${p.shares} sh @ ${fmtCurrency(p.buyPrice)}</span>
          </div>
          <div class="flex gap-8 items-center">
            <span class="text-xs ${pnlPct >= 0 ? 'text-green' : 'text-red'}">${fmtPct(pnlPct)}</span>
          </div>
        </div>`;
    }).join('');
  }
}

// ══════════════════════════════════════════════════════════════════
// PORTFOLIO VIEW
// ══════════════════════════════════════════════════════════════════

function renderPortfolioView() {
  state.portfolio = loadPortfolio();
  const summary = portfolioSummary(state.portfolio);
  const currency = state.settings?.currency || 'USD';

  document.getElementById('pTotalValue').textContent = fmtCurrency(summary.totalValue || 0, currency);
  document.getElementById('pTotalPnL').textContent = (summary.totalPnL >= 0 ? '+' : '') + fmtCurrency(summary.totalPnL);
  document.getElementById('pTotalPnL').className = 'stat-value ' + (summary.totalPnL >= 0 ? 'pos' : 'neg');
  const pnlPctEl = document.getElementById('pTotalPnLPct');
  if (pnlPctEl) pnlPctEl.textContent = fmtPct(summary.totalPnLPct);
  document.getElementById('pPositionCount').textContent = summary.positions;

  const grid = document.getElementById('pPositionGrid');
  if (state.portfolio.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-icon">💼</div>
      <div class="empty-title">No positions yet</div>
      <div>Analyse a stock and click "Add to Portfolio" to track it here.</div>
    </div>`;
    document.getElementById('pCorrelation').style.display = 'none';
    return;
  }

  grid.innerHTML = state.portfolio.map(p => renderPositionCard(p)).join('');

  // Correlation matrix (if ≥ 2 positions with cached data)
  const withData = state.portfolio.filter(p => state.portfolioCache[p.symbol]);
  if (withData.length >= 2) {
    const portData = withData.map(p => ({
      symbol: p.symbol,
      close: state.portfolioCache[p.symbol].data.close,
    }));
    const matrix = correlationMatrix(portData);
    document.getElementById('pCorrelation').style.display = 'block';
    renderCorrelationHeatmap('pCorrChart', withData.map(p => p.symbol), matrix);
  } else {
    document.getElementById('pCorrelation').style.display = 'none';
  }
}

function renderPositionCard(p) {
  const { pnl, pnlPct } = positionPnL(p);
  const cost = p.shares * p.buyPrice;
  const value = p.currentPrice ? p.shares * p.currentPrice : null;

  return `
    <div class="position-card ${signalCardClass(p.lastSignal)}">
      <div class="pos-header">
        <div>
          <div class="pos-ticker">${p.symbol}</div>
          <div class="pos-name">${p.name}</div>
        </div>
        <div class="flex gap-8 items-center">
          ${p.lastSignal ? `<span class="badge ${signalBadgeClass(p.lastSignal)}">${p.lastSignal}</span>` : ''}
          <div class="pos-actions">
            <button class="btn btn-ghost btn-xs" onclick="refreshPosition('${p.symbol}')" title="Refresh signal">↻</button>
            <button class="btn btn-danger btn-xs" onclick="removePos('${p.symbol}')" title="Remove">✕</button>
          </div>
        </div>
      </div>

      <div class="pos-grid">
        <div class="pos-stat">
          <div class="pos-stat-label">Shares</div>
          <div class="pos-stat-val">${p.shares.toLocaleString()}</div>
        </div>
        <div class="pos-stat">
          <div class="pos-stat-label">Avg Cost</div>
          <div class="pos-stat-val">${fmtCurrency(p.buyPrice)}</div>
        </div>
        <div class="pos-stat">
          <div class="pos-stat-label">Current</div>
          <div class="pos-stat-val">${p.currentPrice ? fmtCurrency(p.currentPrice) : '—'}</div>
        </div>
        <div class="pos-stat">
          <div class="pos-stat-label">Cost Basis</div>
          <div class="pos-stat-val">${fmtCurrency(cost)}</div>
        </div>
        <div class="pos-stat">
          <div class="pos-stat-label">Market Value</div>
          <div class="pos-stat-val">${value ? fmtCurrency(value) : '—'}</div>
        </div>
        <div class="pos-stat">
          <div class="pos-stat-label">P&L</div>
          <div class="pos-stat-val ${pnlPct >= 0 ? 'pos' : 'neg'}">${fmtPct(pnlPct)} ${pnl != null ? '(' + (pnl >= 0 ? '+' : '') + fmtCurrency(pnl) + ')' : ''}</div>
        </div>
      </div>

      <div class="pos-footer">
        <div class="flex gap-12 flex-wrap">
          <div class="mini-metric"><span class="mini-metric-label">TF</span><span class="mini-metric-val" style="margin-left:4px;">${p.timeframe || '—'}</span></div>
          <div class="mini-metric"><span class="mini-metric-label">RISK</span><span class="mini-metric-val" style="margin-left:4px;">${riskProfile(p.riskLevel || 50).label}</span></div>
          <div class="mini-metric"><span class="mini-metric-label">SINCE</span><span class="mini-metric-val" style="margin-left:4px;">${fmtDate(p.buyDate)}</span></div>
        </div>
        ${p.lastUpdated ? `<div class="text-xs text-muted">Updated ${timeAgo(p.lastUpdated)}</div>` : ''}
      </div>

      ${p.notes ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);font-style:italic;">${p.notes}</div>` : ''}
    </div>`;
}

async function refreshPosition(symbol) {
  showToast(`Refreshing ${symbol}…`);
  const pos = loadPortfolio().find(p => p.symbol === symbol);
  if (!pos) return;

  try {
    const now = Math.floor(Date.now() / 1000);
    const start = Math.floor(Date.now() / 1000) - 60 * 24 * 3600;
    const data = await fetchYahooOHLCV(symbol, start, now, '1d');
    const config = timeframeConfig(pos.timeframe || 'swing');
    const ind = buildIndicators(data, config);
    const riskLvl = (pos.riskLevel || 50) / 100;

    const { bestWeights, bestSignal } = await optimise(data.close, ind, {
      nTrials: 200,
      riskLevel: riskLvl,
    });

    const lastRSI = ind.rsi.filter(v => v != null).pop();
    const signal = currentSignal(bestSignal, lastRSI, riskLvl);
    const lastPrice = data.close[data.close.length - 1];
    const funds = await fetchFundamentals(symbol);

    state.portfolioCache[symbol] = { data, ind, net: bestSignal, signal, funds, riskLvl };

    updatePositionLiveData(symbol, { currentPrice: lastPrice, lastSignal: signal, fundamentals: funds });
    state.portfolio = loadPortfolio();
    renderPortfolioView();
    renderDashboard();
    showToast(`${symbol} updated — signal: ${signal}`);
  } catch (e) {
    showToast(`Failed to refresh ${symbol}: ${e.message}`, 'error');
  }
}

async function refreshAllPositions() {
  const btn = document.getElementById('pRefreshAll');
  if (btn) btn.disabled = true;
  const positions = loadPortfolio();
  for (const p of positions) {
    await refreshPosition(p.symbol);
    await new Promise(r => setTimeout(r, 500)); // rate-limit
  }
  if (btn) btn.disabled = false;
  showToast('All positions refreshed');
}

function removePos(symbol) {
  if (!confirm(`Remove ${symbol} from portfolio?`)) return;
  removePosition(symbol);
  state.portfolio = loadPortfolio();
  renderPortfolioView();
  renderDashboard();
  updatePortfolioBadge();
  showToast(`${symbol} removed`);
}

// ══════════════════════════════════════════════════════════════════
// WATCHLIST VIEW
// ══════════════════════════════════════════════════════════════════

function renderWatchlistView() {
  state.watchlist = loadWatchlist();
  const container = document.getElementById('wList');

  if (state.watchlist.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="empty-state" style="text-align:center;padding:40px;">
      <div class="empty-icon">👁</div>
      <div class="empty-title">Watchlist is empty</div>
      <div>Add symbols from the Analysis view or enter one below.</div>
    </td></tr>`;
    return;
  }

  container.innerHTML = state.watchlist.map(w => `
    <tr>
      <td><span style="font-weight:500;">${w.symbol}</span></td>
      <td class="text-muted text-xs">${w.name || '—'}</td>
      <td>${w.currentPrice ? fmtCurrency(w.currentPrice) : '—'}</td>
      <td>${w.lastSignal ? `<span class="badge ${signalBadgeClass(w.lastSignal)}">${w.lastSignal}</span>` : '—'}</td>
      <td class="text-xs text-muted">${w.lastUpdated ? timeAgo(w.lastUpdated) : '—'}</td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-xs" onclick="analyseFromWatchlist('${w.symbol}')">Analyse</button>
          <button class="btn btn-danger btn-xs" onclick="removeWatch('${w.symbol}')">✕</button>
        </div>
      </td>
    </tr>`).join('');
}

function addWatchlistManual() {
  const input = document.getElementById('wAddInput');
  const sym = input.value.trim().toUpperCase();
  if (!sym) return;
  addToWatchlist(sym);
  state.watchlist = loadWatchlist();
  input.value = '';
  renderWatchlistView();
  updateWatchlistBadge();
  showToast(`${sym} added to watchlist`);
}

function removeWatch(symbol) {
  removeFromWatchlist(symbol);
  state.watchlist = loadWatchlist();
  renderWatchlistView();
  updateWatchlistBadge();
}

function analyseFromWatchlist(symbol) {
  document.getElementById('aSymbol').value = symbol;
  switchView('analysis');
  setTimeout(() => runAnalysis(), 100);
}

async function refreshWatchlist() {
  const btn = document.getElementById('wRefreshBtn');
  if (btn) btn.disabled = true;
  for (const w of state.watchlist) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const start = now - 30 * 24 * 3600;
      const data = await fetchYahooOHLCV(w.symbol, start, now, '1d');
      const ind = buildIndicators(data);
      const { bestSignal } = await optimise(data.close, ind, { nTrials: 100 });
      const lastRSI = ind.rsi.filter(v => v != null).pop();
      const signal = currentSignal(bestSignal, lastRSI, 0.5);
      const list = loadWatchlist();
      const idx = list.findIndex(l => l.symbol === w.symbol);
      if (idx >= 0) {
        list[idx].currentPrice = data.close[data.close.length - 1];
        list[idx].lastSignal = signal;
        list[idx].name = data.name;
        list[idx].lastUpdated = Date.now();
        saveWatchlist(list);
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (e) { /* skip failed tickers */ }
  }
  state.watchlist = loadWatchlist();
  renderWatchlistView();
  if (btn) btn.disabled = false;
  showToast('Watchlist refreshed');
}

// ══════════════════════════════════════════════════════════════════
// SETTINGS VIEW
// ══════════════════════════════════════════════════════════════════

function renderSettingsView() {
  const s = state.settings;
  document.getElementById('sDefaultRisk').value = s.defaultRisk;
  document.getElementById('sDefaultTf').value = s.defaultTimeframe;
  document.getElementById('sDefaultPeriod').value = s.defaultPeriod;
  document.getElementById('sInitialBalance').value = s.initialBalance;
}

function saveSettingsForm() {
  const s = {
    defaultRisk: parseInt(document.getElementById('sDefaultRisk').value),
    defaultTimeframe: document.getElementById('sDefaultTf').value,
    defaultPeriod: parseInt(document.getElementById('sDefaultPeriod').value),
    initialBalance: parseFloat(document.getElementById('sInitialBalance').value),
    currency: state.settings.currency,
  };
  saveSettings(s);
  state.settings = s;
  showAlert('sAlert', 'ok', 'Settings saved.');
  setTimeout(() => hideAlert('sAlert'), 2500);
}

function clearAllData() {
  if (!confirm('Clear all portfolio, watchlist and settings data? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(WATCHLIST_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  state.portfolio = [];
  state.watchlist = [];
  state.settings = loadSettings();
  state.portfolioCache = {};
  renderDashboard();
  renderPortfolioView();
  renderWatchlistView();
  renderSettingsView();
  updatePortfolioBadge();
  updateWatchlistBadge();
  showToast('All data cleared');
}

// ══════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════

function adjustWeekend(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() - 1);
  if (day === 0) d.setDate(d.getDate() - 2);
  return d.toISOString().split('T')[0];
}

function showAlert(id, type, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

let toastTimer;
function showToast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function setLoadingSteps(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('active', show);
  if (!show) {
    el.querySelectorAll('.step').forEach(s => s.classList.remove('active', 'done'));
  }
}

function setStep(loadingId, stepNum) {
  const el = document.getElementById(loadingId);
  if (!el) return;
  el.querySelectorAll('.step').forEach((s, i) => {
    if (i < stepNum - 1) { s.classList.add('done'); s.classList.remove('active'); s.querySelector('.step-bullet').textContent = '✓'; }
    else if (i === stepNum - 1) { s.classList.add('active'); s.classList.remove('done'); }
    else { s.classList.remove('active', 'done'); }
  });
}

function updatePortfolioBadge() {
  const badge = document.getElementById('portfolioBadge');
  const n = loadPortfolio().length;
  if (badge) badge.textContent = n;
}

function updateWatchlistBadge() {
  const badge = document.getElementById('watchlistBadge');
  const n = loadWatchlist().length;
  if (badge) badge.textContent = n;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Export CSV
function exportPortfolioCSV() {
  const portfolio = loadPortfolio();
  if (!portfolio.length) { showToast('Portfolio is empty', 'error'); return; }

  const headers = ['Symbol', 'Name', 'Shares', 'Buy Price', 'Buy Date', 'Current Price', 'P&L%', 'Signal', 'Timeframe', 'Risk Level'];
  const rows = portfolio.map(p => {
    const { pnlPct } = positionPnL(p);
    return [
      p.symbol, p.name, p.shares, p.buyPrice, p.buyDate,
      p.currentPrice || '', pnlPct != null ? pnlPct.toFixed(2) + '%' : '',
      p.lastSignal || '', p.timeframe, riskProfile(p.riskLevel || 50).label
    ];
  });

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `morfeo-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('Portfolio exported');
}
