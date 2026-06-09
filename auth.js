const AUTH_KEY = 'habitSyncAuth';
const THEME_KEY = 'habitSyncTheme:v1';

function getPageName() {
  const page = window.location.pathname.split('/').pop();
  return page || 'index.html';
}

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

function getSavedTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  return theme === 'dark' ? 'dark' : 'light';
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark');
  document.body.classList.toggle('theme-light', theme !== 'dark');
}

function getThemeButtonLabel(theme) {
  return theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

function renderThemeToggle() {
  const header = document.querySelector('header');
  if (!header) {
    return;
  }

  let wrapper = document.getElementById('themeToggleWrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'themeToggleWrapper';
    wrapper.className = 'theme-actions';

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'themeToggleBtn';
    button.className = 'theme-toggle-btn';
    button.addEventListener('click', () => {
      const currentTheme = getSavedTheme();
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      saveTheme(nextTheme);
      applyTheme(nextTheme);
      button.textContent = getThemeButtonLabel(nextTheme);
    });

    wrapper.appendChild(button);
    header.appendChild(wrapper);
  }

  const button = document.getElementById('themeToggleBtn');
  if (button) {
    button.textContent = getThemeButtonLabel(getSavedTheme());
  }
}

function initTheme() {
  const theme = getSavedTheme();
  applyTheme(theme);
  renderThemeToggle();
}

const LOGIN_ATTEMPTS_KEY = 'habitSyncLoginAttempts:v1';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;

function saveAuth(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

function getLoginAttemptState() {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function saveLoginAttemptState(state) {
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(state));
}

function clearLoginAttempts() {
  saveLoginAttemptState({ attempts: 0, lockedUntil: null });
}

function registerFailedLoginAttempt() {
  const state = getLoginAttemptState();
  state.attempts = (state.attempts || 0) + 1;
  if (state.attempts >= MAX_LOGIN_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  saveLoginAttemptState(state);
}

function isLoginLockedOut() {
  const state = getLoginAttemptState();
  return state.lockedUntil && Date.now() < state.lockedUntil;
}

function getLockoutMessage() {
  const state = getLoginAttemptState();
  if (!state.lockedUntil) return '';
  const remaining = Math.max(0, Math.ceil((state.lockedUntil - Date.now()) / 1000));
  return `Too many failed attempts. Please try again in ${remaining} second${remaining === 1 ? '' : 's'}.`;
}

function isAuthenticated() {
  const auth = getAuth();
  return auth && typeof auth.username === 'string' && auth.username.length > 0;
}

function isUsernameValid(username) {
  return typeof username === 'string' && username.trim().length >= 5 && /^[A-Za-z0-9._-]+$/.test(username);
}

function isPasswordStrong(password) {
  return typeof password === 'string'
    && password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
}

function getLoginValidationError(username, password) {
  if (!username || !password) {
    return 'Please enter both username and password.';
  }
  if (username.length < 5) {
    return 'Username must be at least 5 characters.';
  }
  if (!/^[A-Za-z0-9._-]+$/.test(username)) {
    return 'Username may only include letters, numbers, dots, underscores, or hyphens.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Password must include at least one special character.';
  }
  return '';
}

function login(username, password) {
  if (!isUsernameValid(username) || !isPasswordStrong(password)) {
    return false;
  }
  saveAuth({ username: username.trim(), loggedAt: Date.now() });
  clearLoginAttempts();
  return true;
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'index.html';
}

function requireAuth() {
  if (isAuthenticated()) {
    return true;
  }

  const page = getPageName();
  if (page === 'index.html') {
    return true;
  }

  window.location.href = 'index.html';
  return false;
}

function renderLogout() {
  if (!isAuthenticated()) {
    return;
  }

  const auth = getAuth();
  const existing = document.getElementById('authControls') || document.getElementById('homeAuthControls');
  if (existing && existing.childNodes.length > 0) {
    return;
  }

  const container = existing || document.createElement('div');
  if (!existing) {
    container.id = 'authControls';
    container.className = 'auth-actions';
    const header = document.querySelector('header');
    if (!header) {
      return;
    }
    header.appendChild(container);
  }

  const usernameLabel = document.createElement('span');
  usernameLabel.className = 'auth-user';
  usernameLabel.textContent = `Signed in as ${auth.username}`;
  container.appendChild(usernameLabel);

  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.id = 'logoutBtn';
  logoutBtn.className = 'logout-btn';
  logoutBtn.textContent = 'Logout';
  logoutBtn.addEventListener('click', logout);
  container.appendChild(logoutBtn);
}

function renderLoginAuthControls() {
  const container = document.getElementById('loginAuthControls');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (isAuthenticated()) {
    const auth = getAuth();
    const usernameLabel = document.createElement('span');
    usernameLabel.className = 'auth-user';
    usernameLabel.textContent = `Signed in as ${auth.username}`;
    container.appendChild(usernameLabel);

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', logout);
    container.appendChild(logoutBtn);
    return;
  }

  const signInText = document.createElement('span');
  signInText.className = 'auth-user';
  signInText.textContent = 'Not signed in';
  container.appendChild(signInText);
}

function initLoginPage() {
  const loginShell = document.getElementById('loginShell');
  const mainShell = document.getElementById('mainShell');
  if (mainShell) {
    mainShell.style.display = 'none';
  }
  if (loginShell) {
    loginShell.style.display = 'block';
  }

  renderLoginAuthControls();

  const loginForm = document.getElementById('loginForm');
  const message = document.getElementById('authMessage');
  if (!loginForm || !message) {
    return;
  }

  if (isAuthenticated()) {
    const auth = getAuth();
    message.textContent = `Already signed in as ${auth.username}. Use Logout to switch accounts.`;
  }

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (isLoginLockedOut()) {
      message.textContent = getLockoutMessage();
      return;
    }

    const validationError = getLoginValidationError(username, password);
    if (validationError) {
      registerFailedLoginAttempt();
      message.textContent = validationError;
      return;
    }

    if (!login(username, password)) {
      registerFailedLoginAttempt();
      message.textContent = getLockoutMessage() || 'Login failed. Try again.';
      return;
    }

    message.textContent = '';
    window.location.href = 'home.html';
  });
}

function initAuth() {
  const page = getPageName();
  if (page === 'index.html') {
    initLoginPage();
    return;
  }
  if (!requireAuth()) {
    return;
  }
  renderLogout();
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
});
