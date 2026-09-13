const AUTH_KEY = 'habitSyncAuth';
const USERS_KEY = 'habitSyncUsers:v1';
const THEME_KEY = 'habitSyncTheme:v1';
const LOGIN_ATTEMPTS_KEY = 'habitSyncLoginAttempts:v1';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;

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

function saveAuth(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
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

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const users = raw ? JSON.parse(raw) : [];
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
  return typeof username === 'string' && username.trim().length >= 5 && /^[A-Za-z0-9._-]+$/.test(username.trim());
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
  const value = typeof username === 'string' ? username.trim() : '';
  if (!value || !password) {
    return 'Please enter both username and password.';
  }
  if (value.length < 5) {
    return 'Username must be at least 5 characters.';
  }
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    return 'Username may only include letters, numbers, dots, underscores, or hyphens.';
  }
  if (!isPasswordStrong(password)) {
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
  }
  return '';
}

function getSignupValidationError(username, password, confirmPassword) {
  const value = typeof username === 'string' ? username.trim() : '';
  if (!value || !password || !confirmPassword) {
    return 'Please complete all sign up fields.';
  }
  const loginError = getLoginValidationError(value, password);
  if (loginError) {
    return loginError;
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  const existingUsers = getUsers();
  const isTaken = existingUsers.some((entry) => entry.username.toLowerCase() === value.toLowerCase());
  if (isTaken) {
    return 'This username is already taken.';
  }
  return '';
}

function login(username, password) {
  const trimmedUsername = typeof username === 'string' ? username.trim() : '';
  if (!isUsernameValid(trimmedUsername) || !isPasswordStrong(password)) {
    return false;
  }

  const users = getUsers();
  const matchingUser = users.find((user) => user.username.toLowerCase() === trimmedUsername.toLowerCase());
  if (!matchingUser || matchingUser.password !== password) {
    return false;
  }

  saveAuth({ username: matchingUser.username, loggedAt: Date.now() });
  clearLoginAttempts();
  return true;
}

function registerUser(username, password, confirmPassword) {
  const trimmedUsername = typeof username === 'string' ? username.trim() : '';
  const error = getSignupValidationError(trimmedUsername, password, confirmPassword);
  if (error) {
    return { success: false, error };
  }

  const users = getUsers();
  users.push({ username: trimmedUsername, password });
  saveUsers(users);
  saveAuth({ username: trimmedUsername, loggedAt: Date.now() });
  clearLoginAttempts();
  return { success: true, username: trimmedUsername };
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

function setAuthMode(mode) {
  const loginPanel = document.getElementById('loginPanel');
  const signupPanel = document.getElementById('signupPanel');
  const tabs = document.querySelectorAll('.auth-tab');

  if (loginPanel) loginPanel.hidden = mode !== 'login';
  if (signupPanel) signupPanel.hidden = mode !== 'signup';

  tabs.forEach((tab) => {
    const isActive = tab.dataset.authMode === mode;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
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

  const message = document.getElementById('authMessage');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabs = document.querySelectorAll('.auth-tab');

  if (tabs.length) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        if (message) {
          message.textContent = '';
        }
        setAuthMode(tab.dataset.authMode);
      });
    });
  }

  if (isAuthenticated()) {
    if (message) {
      const auth = getAuth();
      message.textContent = `Already signed in as ${auth.username}. Use Logout to switch accounts.`;
    }
  }

  if (loginForm) {
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
        message.textContent = getLockoutMessage() || 'Invalid username or password. Please try again.';
        return;
      }

      if (message) message.textContent = '';
      window.location.href = 'home.html';
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = document.getElementById('signupUsername').value.trim();
      const password = document.getElementById('signupPassword').value.trim();
      const confirmPassword = document.getElementById('signupConfirmPassword').value.trim();

      const result = registerUser(username, password, confirmPassword);
      if (!result.success) {
        message.textContent = result.error;
        return;
      }

      if (message) {
        message.textContent = 'Account created successfully. Redirecting...';
      }
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 600);
    });
  }

  setAuthMode('login');
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
