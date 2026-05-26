// CampusFlow Authentication & Session Guard Module
import { Store } from './store.js';

export class AuthController {
  constructor(appContainerId, authContainerId) {
    this.appContainer = document.getElementById(appContainerId);
    this.authContainer = document.getElementById(authContainerId);
    
    this.currentTab = 'login'; // 'login' or 'register'
    
    // Bind global store updates to track logins/logouts
    Store.subscribe((state, user) => this.handleSessionUpdate(user));
  }

  // Intercept boot and check session status
  init() {
    this.ensureDefaultUserSeeded();
    const user = Store.getCurrentUser();
    this.handleSessionUpdate(user);
  }

  ensureDefaultUserSeeded() {
    try {
      const storedUsers = localStorage.getItem("campusflow_users");
      let users = [];
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed)) {
          users = parsed;
        }
      }
      if (users.length === 0) {
        users = [
          {
            username: "shubham",
            fullName: "Shubham Ghodasara",
            email: "shubham@college.edu",
            password: "password",
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem("campusflow_users", JSON.stringify(users));
      }
    } catch (e) {
      console.error("Failed to seed default user", e);
    }
  }

  handleSessionUpdate(user) {
    if (user) {
      // User is logged in, hide auth, reveal main app container
      this.authContainer.style.display = 'none';
      this.authContainer.innerHTML = '';
      this.appContainer.style.display = 'grid';
    } else {
      // User is logged out, hide main app, reveal login wrapper
      this.appContainer.style.display = 'none';
      this.authContainer.style.display = 'flex';
      this.renderAuthCard();
    }
  }

  // Render the modern glass auth card
  renderAuthCard() {
    this.authContainer.innerHTML = `
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">CampusFlow</div>
          <div class="auth-subtitle">Your Central Productivity Dashboard</div>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab-btn ${this.currentTab === 'login' ? 'active' : ''}" id="tab-login">Login</button>
          <button class="auth-tab-btn ${this.currentTab === 'register' ? 'active' : ''}" id="tab-register">Register</button>
        </div>

        <div class="auth-error" id="auth-error-banner"></div>

        <form id="auth-form" class="dialog-form" autocomplete="on">
          ${this.currentTab === 'login' ? this.getLoginFields() : this.getRegisterFields()}
          
          <button type="submit" class="auth-btn" id="auth-submit-btn">
            ${this.currentTab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div class="auth-switch-prompt">
          ${this.currentTab === 'login' 
            ? `New to CampusFlow? <span class="auth-switch-link" id="link-switch">Create an account</span>`
            : `Already have an account? <span class="auth-switch-link" id="link-switch">Sign in instead</span>`
          }
        </div>
      </div>
    `;

    this.attachFormListeners();
  }

  getLoginFields() {
    return `
      <div class="auth-form-group">
        <label for="login-username">Username</label>
        <div class="auth-input-wrapper">
          <input type="text" id="login-username" class="auth-input" placeholder="e.g. shubham" required autocomplete="username">
        </div>
      </div>
      <div class="auth-form-group">
        <label for="login-password">Password</label>
        <div class="auth-input-wrapper">
          <input type="password" id="login-password" class="auth-input" placeholder="••••••••" required autocomplete="current-password">
        </div>
      </div>
      <div class="auth-demo-hint" style="font-size: 12px; color: var(--text-muted); text-align: center; margin-top: 12px; background: rgba(99, 102, 241, 0.05); padding: 8px; border-radius: var(--radius-sm); border: 1px dashed rgba(99, 102, 241, 0.2);">
        <i class="fa-solid fa-circle-info" style="color: var(--color-primary); margin-right: 4px;"></i>
        Demo Login: <strong style="color: var(--text-primary)">shubham</strong> / <strong style="color: var(--text-primary)">password</strong>
      </div>
    `;
  }

  getRegisterFields() {
    return `
      <div class="auth-form-group">
        <label for="reg-fullname">Full Name</label>
        <div class="auth-input-wrapper">
          <input type="text" id="reg-fullname" class="auth-input" placeholder="e.g. Shubham Ghodasara" required autocomplete="name">
        </div>
      </div>
      <div class="auth-form-group">
        <label for="reg-email">Email Address</label>
        <div class="auth-input-wrapper">
          <input type="email" id="reg-email" class="auth-input" placeholder="e.g. shubham@college.edu" required autocomplete="email">
        </div>
      </div>
      <div class="auth-form-group">
        <label for="reg-username">Username</label>
        <div class="auth-input-wrapper">
          <input type="text" id="reg-username" class="auth-input" placeholder="e.g. shubham" required autocomplete="username">
        </div>
      </div>
      <div class="auth-form-group">
        <label for="reg-password">Password</label>
        <div class="auth-input-wrapper">
          <input type="password" id="reg-password" class="auth-input" placeholder="Min. 6 characters" required autocomplete="new-password" minlength="6">
        </div>
      </div>
    `;
  }

  attachFormListeners() {
    // Tab toggles
    document.getElementById('tab-login')?.addEventListener('click', () => {
      this.currentTab = 'login';
      this.renderAuthCard();
    });
    
    document.getElementById('tab-register')?.addEventListener('click', () => {
      this.currentTab = 'register';
      this.renderAuthCard();
    });
    
    document.getElementById('link-switch')?.addEventListener('click', () => {
      this.currentTab = this.currentTab === 'login' ? 'register' : 'login';
      this.renderAuthCard();
    });

    // Form Submission
    const form = document.getElementById('auth-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });
  }

  // Core Authentication Handling
  handleFormSubmit() {
    const errorBanner = document.getElementById('auth-error-banner');
    errorBanner.style.display = 'none';
    errorBanner.innerText = '';

    // Load registered users database
    let users = [];
    try {
      const storedUsers = localStorage.getItem("campusflow_users");
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed)) {
          users = parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load users database", e);
    }

    // Pre-seed default user if database is empty
    if (users.length === 0) {
      users = [
        {
          username: "shubham",
          fullName: "Shubham Ghodasara",
          email: "shubham@college.edu",
          password: "password",
          createdAt: new Date().toISOString()
        }
      ];
      try {
        localStorage.setItem("campusflow_users", JSON.stringify(users));
      } catch (e) {
        console.error("Failed to seed default user", e);
      }
    }

    if (this.currentTab === 'login') {
      const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
      const passwordInput = document.getElementById('login-password').value;

      const matchedUser = users.find(u => u.username === usernameInput);
      
      if (!matchedUser || matchedUser.password !== passwordInput) {
        this.showError("Invalid username or password. Please try again.");
        return;
      }

      // Successful Login
      Store.login(matchedUser.username, matchedUser.fullName, matchedUser.email);
    } else {
      // Register logic
      const fullName = document.getElementById('reg-fullname').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const username = document.getElementById('reg-username').value.trim().toLowerCase();
      const password = document.getElementById('reg-password').value;

      if (username.length < 3) {
        this.showError("Username must be at least 3 characters.");
        return;
      }

      if (password.length < 6) {
        this.showError("Password must be at least 6 characters.");
        return;
      }

      // Check if username is already taken
      const isTaken = users.some(u => u.username === username);
      if (isTaken) {
        this.showError("This username is already taken. Try another.");
        return;
      }

      // Create new user profile
      const newUser = { username, fullName, email, password, createdAt: new Date().toISOString() };
      users.push(newUser);
      
      try {
        localStorage.setItem("campusflow_users", JSON.stringify(users));
      } catch (e) {
        this.showError("Database storage error. Please try again.");
        return;
      }

      // Log the user in directly upon successful registration
      Store.login(newUser.username, newUser.fullName, newUser.email);
    }
  }

  showError(message) {
    const errorBanner = document.getElementById('auth-error-banner');
    if (errorBanner) {
      errorBanner.innerText = message;
      errorBanner.style.display = 'block';
    }
  }
}
