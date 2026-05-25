// CampusFlow Persistent Reactive State Store

class GlobalStore {
  constructor() {
    this.listeners = [];
    this.currentUser = null;
    this.state = this.getDefaultState();
    
    // Auto load current user session on startup
    this.loadSession();
  }

  // Define fallback defaults
  getDefaultState() {
    return {
      subjects: ["Computer Science", "Mathematics", "Physics", "Economics"],
      assignments: [],
      attendance: {},
      notes: []
    };
  }

  // Get active session user
  loadSession() {
    try {
      const storedUser = localStorage.getItem("campusflow_session");
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        this.loadUserData(this.currentUser.username);
      }
    } catch (e) {
      console.error("Failed to load session", e);
    }
  }

  // Load standard user data
  loadUserData(username) {
    try {
      const userData = localStorage.getItem(`campusflow_data_${username}`);
      if (userData) {
        this.state = JSON.parse(userData);
      } else {
        // First-time user, seed structural demo data
        this.state = this.generateSeedData();
        this.saveUserData(username);
      }
    } catch (e) {
      console.error("Failed to load user data", e);
      this.state = this.getDefaultState();
    }
  }

  // Save structural state back to localStorage
  saveUserData(username) {
    try {
      localStorage.setItem(`campusflow_data_${username}`, JSON.stringify(this.state));
    } catch (e) {
      console.error("Failed to save user data", e);
    }
  }

  // Central State Mutator
  setState(updater) {
    const nextState = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = { ...this.state, ...nextState };
    
    if (this.currentUser) {
      this.saveUserData(this.currentUser.username);
    }
    
    // Publish updates to all listeners
    this.notify();
  }

  getState() {
    return this.state;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // Pub-sub reactive registration
  subscribe(listener) {
    this.listeners.push(listener);
    // Return unsubscribe callback
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state, this.currentUser));
  }

  // Auth Operations
  login(username, fullName, email) {
    const userSession = { username, fullName, email, loggedInAt: new Date().toISOString() };
    this.currentUser = userSession;
    localStorage.setItem("campusflow_session", JSON.stringify(userSession));
    
    // Load associated profile statistics
    this.loadUserData(username);
    this.notify();
  }

  logout() {
    this.currentUser = null;
    this.state = this.getDefaultState();
    localStorage.removeItem("campusflow_session");
    this.notify();
  }

  // Pre-populate high quality seed data to showcase the dashboard immediately
  generateSeedData() {
    // Generate ISO deadlines relative to today to prevent static stale dates
    const getRelativeDateISO = (daysOffset, hoursSet = 18) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      d.setHours(hoursSet, 0, 0, 0);
      return d.toISOString();
    };

    return {
      subjects: ["Computer Science", "Mathematics", "Physics", "Economics"],
      assignments: [
        {
          id: "seed-task-1",
          title: "Algorithmic Complexity Research Paper",
          subject: "Computer Science",
          deadline: getRelativeDateISO(3, 23), // Due in 3 days
          priority: "high",
          completed: false
        },
        {
          id: "seed-task-2",
          title: "Linear Algebra Problem Set 4 (Orthogonal Projections)",
          subject: "Mathematics",
          deadline: getRelativeDateISO(1, 12), // Due tomorrow
          priority: "medium",
          completed: false
        },
        {
          id: "seed-task-3",
          title: "Macroeconomics Semester Term Quiz Review",
          subject: "Economics",
          deadline: getRelativeDateISO(0, 20), // Due today
          priority: "low",
          completed: false
        },
        {
          id: "seed-task-4",
          title: "Quantum Mechanics Lab Report: Wave-Particle Duality",
          subject: "Physics",
          deadline: getRelativeDateISO(-5), // Due 5 days ago (completed)
          priority: "high",
          completed: true
        }
      ],
      attendance: {
        "Computer Science": { attended: 18, total: 20 },  // 90% (Excellent)
        "Mathematics": { attended: 12, total: 18 },       // 66.7% (Low Attendance Alert)
        "Physics": { attended: 14, total: 15 },           // 93.3% (Excellent)
        "Economics": { attended: 6, total: 10 }            // 60% (Low Attendance Alert)
      },
      notes: [
        {
          id: "seed-note-1",
          title: "Linear Regression & Least Squares derivation",
          subject: "Mathematics",
          content: "Formula for slope: b = r * (Sy / Sx)\nFormula for intercept: a = mean(Y) - b * mean(X)\n\nLeast squares minimizes the sum of squared residuals: RSS = sum(y_i - f(x_i))^2.",
          links: [
            { name: "StatQuest Visualizer", url: "https://statquest.org" },
            { name: "MathWorld Derivation", url: "https://mathworld.wolfram.com/LeastSquaresFitting.html" }
          ],
          updatedAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
        },
        {
          id: "seed-note-2",
          title: "Asymptotic Complexity cheat sheet",
          subject: "Computer Science",
          content: "O(1) - Constant Time\nO(log n) - Logarithmic Time (Binary Search)\nO(n) - Linear Time (Simple Scan)\nO(n log n) - Linearithmic Time (Merge Sort, Quick Sort)\nO(n^2) - Quadratic Time (Bubble Sort)",
          links: [
            { name: "Big O Cheat Sheet Reference", url: "https://www.bigocheatsheet.com" }
          ],
          updatedAt: new Date(Date.now() - 3600000 * 24).toISOString() // 24 hours ago
        }
      ]
    };
  }
}

// Instantiate and export global store
export const Store = new GlobalStore();
