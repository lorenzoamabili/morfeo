// ═══════════════════════════════════════════════════════════════
// MORFEO — auth.js
// Auth guard: redirects to /login.html if not authenticated.
// Exposes: logout(), currentUser (set after initAuth resolves)
// ═══════════════════════════════════════════════════════════════

let currentUser = null;

async function initAuth() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) {
      window.location.replace('/login.html');
      // Suspend execution forever — the page will navigate away.
      // Without this, app.js continues initialising while redirecting.
      await new Promise(() => {});
    }
    currentUser = await res.json();
    renderUserChip(currentUser.email);
    // Reveal the app now that auth is confirmed
    document.getElementById('authGate').style.display = 'none';
    document.querySelector('.app').style.display = 'flex';
    return currentUser;
  } catch {
    // Server not reachable — offline / plain file-server mode.
    // Show the app anyway so it remains usable without a backend.
    document.getElementById('authGate').style.display = 'none';
    document.querySelector('.app').style.display = 'flex';
    console.warn('[Morfeo] Auth server not reachable — running in offline mode');
    return null;
  }
}

function renderUserChip(email) {
  const container = document.getElementById('userChip');
  if (!container) return;

  const label = email.length > 22 ? email.slice(0, 20) + '\u2026' : email;

  const emailSpan = document.createElement('span');
  emailSpan.className = 'user-chip-email';
  emailSpan.textContent = label;

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'user-chip-logout';
  logoutBtn.title = 'Sign out';
  logoutBtn.textContent = 'Sign out';
  logoutBtn.addEventListener('click', logout);

  container.replaceChildren(emailSpan, logoutBtn);
  container.style.display = 'flex';
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    window.location.replace('/login.html');
  }
}
