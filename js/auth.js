// ═══════════════════════════════════════════════════════════════
// MORFEO — auth.js
// Firebase Auth guard. Redirects to /login.html if not logged in.
// Exposes: currentUser, logout()
// Requires: Firebase SDK + firebase-config.js loaded before app.js
// ═══════════════════════════════════════════════════════════════

let currentUser = null;

async function initAuth() {
  // If Firebase config hasn't been filled in, run in offline mode
  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
    console.warn('[Morfeo] Firebase not configured — running in offline mode. Fill in js/firebase-config.js.');
    document.getElementById('authGate').style.display = 'none';
    document.querySelector('.app').style.display = 'flex';
    return null;
  }

  // Initialize Firebase (guard against double-init)
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }

  // Wait for the first auth state event
  return new Promise((resolve) => {
    const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
      unsubscribe(); // only handle the initial check here

      if (!user) {
        window.location.replace('/login.html');
        await new Promise(() => {}); // freeze — page navigates away
        return;
      }

      currentUser = user;
      renderUserChip(user.email);

      // Load user data from Firestore into localStorage before the app renders
      await loadUserDataFromFirestore(user.uid);

      document.getElementById('authGate').style.display = 'none';
      document.querySelector('.app').style.display = 'flex';
      resolve(user);
    });
  });
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
    await firebase.auth().signOut();
  } finally {
    window.location.replace('/login.html');
  }
}
