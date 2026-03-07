// ═══════════════════════════════════════════════════════════════
// MORFEO v3 — portfolio.js
// Persistent portfolio management via localStorage
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'meridian_portfolio_v3';
const WATCHLIST_KEY = 'meridian_watchlist_v3';
const SETTINGS_KEY = 'meridian_settings_v3';

// ── Defaults ─────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  defaultRisk: 50,      // 0-100
  defaultTimeframe: 'swing',
  defaultPeriod: 6,
  initialBalance: 10000,
  currency: 'USD',
};

// ── Settings ──────────────────────────────────────────────────────

function loadSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : { ...DEFAULT_SETTINGS };
  } catch (e) { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Portfolio (held positions) ────────────────────────────────────

function loadPortfolio() {
  try {
    const p = localStorage.getItem(STORAGE_KEY);
    return p ? JSON.parse(p) : [];
  } catch (e) { return []; }
}

function savePortfolio(portfolio) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

// Add or update a position
function upsertPosition(pos) {
  // pos: { symbol, name, shares, buyPrice, buyDate, notes, timeframe, riskLevel }
  const portfolio = loadPortfolio();
  const idx = portfolio.findIndex(p => p.symbol === pos.symbol.toUpperCase());
  const entry = {
    symbol: pos.symbol.toUpperCase(),
    name: pos.name || pos.symbol.toUpperCase(),
    shares: parseFloat(pos.shares),
    buyPrice: parseFloat(pos.buyPrice),
    buyDate: pos.buyDate || new Date().toISOString().split('T')[0],
    notes: pos.notes || '',
    timeframe: pos.timeframe || 'swing',
    riskLevel: pos.riskLevel != null ? pos.riskLevel : 50,
    addedAt: Date.now(),
    // live data — refreshed separately
    currentPrice: null,
    lastSignal: null,
    lastUpdated: null,
    fundamentals: null,
  };
  if (idx >= 0) portfolio[idx] = { ...portfolio[idx], ...entry };
  else portfolio.push(entry);
  savePortfolio(portfolio);
  return portfolio;
}

function removePosition(symbol) {
  const portfolio = loadPortfolio().filter(p => p.symbol !== symbol.toUpperCase());
  savePortfolio(portfolio);
  return portfolio;
}

function updatePositionLiveData(symbol, data) {
  const portfolio = loadPortfolio();
  const idx = portfolio.findIndex(p => p.symbol === symbol.toUpperCase());
  if (idx >= 0) {
    portfolio[idx] = { ...portfolio[idx], ...data, lastUpdated: Date.now() };
    savePortfolio(portfolio);
  }
  return portfolio;
}

// ── Watchlist ────────────────────────────────────────────────────

function loadWatchlist() {
  try {
    const w = localStorage.getItem(WATCHLIST_KEY);
    return w ? JSON.parse(w) : [];
  } catch (e) { return []; }
}

function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

function addToWatchlist(symbol, name = '') {
  const list = loadWatchlist();
  if (!list.find(w => w.symbol === symbol.toUpperCase())) {
    list.push({ symbol: symbol.toUpperCase(), name, addedAt: Date.now(), currentPrice: null, lastSignal: null });
    saveWatchlist(list);
  }
  return list;
}

function removeFromWatchlist(symbol) {
  const list = loadWatchlist().filter(w => w.symbol !== symbol.toUpperCase());
  saveWatchlist(list);
  return list;
}

// ── Portfolio analytics ───────────────────────────────────────────

function portfolioSummary(portfolio) {
  const withPrice = portfolio.filter(p => p.currentPrice != null);

  const totalCost = portfolio.reduce((s, p) => s + p.shares * p.buyPrice, 0);
  const totalValue = withPrice.reduce((s, p) => s + p.shares * p.currentPrice, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const buys = portfolio.filter(p => p.lastSignal === 'BUY').length;
  const sells = portfolio.filter(p => p.lastSignal === 'SELL' || p.lastSignal === 'WATCH-SELL').length;
  const holds = portfolio.length - buys - sells;

  return {
    positions: portfolio.length,
    totalCost: Math.round(totalCost * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    totalPnLPct: Math.round(totalPnLPct * 100) / 100,
    buys, sells, holds,
  };
}

// P&L for a single position
function positionPnL(pos) {
  if (!pos.currentPrice) return { pnl: null, pnlPct: null };
  const pnl = (pos.currentPrice - pos.buyPrice) * pos.shares;
  const pnlPct = ((pos.currentPrice - pos.buyPrice) / pos.buyPrice) * 100;
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
  };
}

// ── Format helpers ────────────────────────────────────────────────

function fmtCurrency(v, currency = 'USD') {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const str = abs >= 1000
    ? abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : abs.toFixed(2);
  const sign = v < 0 ? '-' : '';
  const sym = currency === 'USD' ? '$' : currency + ' ';
  return `${sign}${sym}${str}`;
}

function fmtPct(v, decimals = 2) {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(decimals)}%`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function signalBadgeClass(sig) {
  if (!sig) return 'badge-neu';
  if (sig === 'BUY' || sig === 'WATCH-BUY') return 'badge-buy';
  if (sig === 'SELL' || sig === 'WATCH-SELL') return 'badge-sell';
  return 'badge-hold';
}

function signalCardClass(sig) {
  if (!sig) return '';
  if (sig === 'BUY' || sig === 'WATCH-BUY') return 'signal-buy';
  if (sig === 'SELL' || sig === 'WATCH-SELL') return 'signal-sell';
  return 'signal-hold';
}
