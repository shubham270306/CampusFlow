// CampusFlow Core Application Coordinator
import { Store } from './store.js';
import { AuthController } from './auth.js';
import { AssignmentsController } from './assignments.js';
import { AttendanceController } from './attendance.js';
import { NotesController } from './notes.js';
import { ParticleEngine } from './particles.js';

class AppCoordinator {
  constructor() {
    // 1. Initialize Sub-Controllers
    this.authController = new AuthController('app-container', 'auth-wrapper');
    this.assignmentsController = null;
    this.attendanceController = null;
    this.notesController = null;

    // 2. State & Nav tracking
    this.activeTab = 'dashboard';
    
    // Bind global hooks
    this.initGlobalDOM();
    this.initStoreListeners();
    this.initTheme();

    // 3. Initialize Particle Canvas Cursor Background
    this.particleEngine = new ParticleEngine('canvas-particles');
  }

  // Boot the App
  boot() {
    this.authController.init();
    
    // Google Antigravity Style zero-gravity floating fade-away
    const splash = document.getElementById('splash-screen');
    const letters = document.querySelectorAll('.splash-letter');
    const subtitle = document.querySelector('.splash-subtitle');
    const loaderTrack = document.querySelector('.splash-loader-track');

    if (splash) {
      setTimeout(() => {
        // Trigger Anti-Gravity untethered float-away of the title letters!
        letters.forEach((letter) => {
          // Generate unique trajectories: float upwards and drift outward in random directions
          const angle = Math.random() * Math.PI * 2;
          const distance = 120 + Math.random() * 200; // Drift distance (px)
          const randomX = Math.cos(angle) * distance;
          const randomY = -120 - Math.random() * 250; // Float upwards primarily
          const randomRotate = -90 + Math.random() * 180; // Drift rotations (deg)

          letter.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg) scale(0.75)`;
          letter.style.opacity = '0';
          letter.style.filter = 'blur(12px)';
        });

        // Float the subtitle away
        if (subtitle) {
          subtitle.style.transform = 'translateY(-140px) rotate(15deg) scale(0.9)';
          subtitle.style.opacity = '0';
          subtitle.style.filter = 'blur(8px)';
        }

        // Drop the loader track down and fade
        if (loaderTrack) {
          loaderTrack.style.transform = 'translateY(120px) rotate(-8deg) scaleX(0.7)';
          loaderTrack.style.opacity = '0';
          loaderTrack.style.filter = 'blur(6px)';
        }

        // Smoothly fade out the splash canvas backdrop itself
        splash.classList.add('fade-out');
        
        // Safely remove the overlay nodes from DOM once transitions conclude
        setTimeout(() => {
          splash.remove();
        }, 2800); // 2.8s matches the long ease-out duration of the float transitions
      }, 2600); // Trigger after the 1.6s bar fill + 1s highlight showcases
    }
    
    // Fallback backdrop click dismissal for native <dialog> modals (Safari, Firefox < 141 support)
    this.initDialogBackdropsDismiss();
  }

  initGlobalDOM() {
    // Tab switching event hooks
    const navButtons = document.querySelectorAll('.nav-item-btn[data-tab]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });

    // Logout Click Trigger
    document.getElementById('logout-trigger')?.addEventListener('click', () => {
      if (confirm("Are you sure you want to log out of your session?")) {
        Store.logout();
      }
    });

    // Profile Purge/Reset Trigger
    document.getElementById('btn-purge-local')?.addEventListener('click', () => {
      if (confirm("WARNING: This will permanently delete all your registered classes, assignments, notes, and attendance records on this device. Do you want to proceed?")) {
        const user = Store.getCurrentUser();
        if (user) {
          localStorage.removeItem(`campusflow_data_${user.username}`);
          Store.loadUserData(user.username);
          alert("Data reset complete. Reloading seed defaults.");
        }
      }
    });

    // Theme Toggle Trigger Hook
    const themeBtn = document.getElementById('theme-toggle-btn');
    themeBtn?.addEventListener('click', () => this.toggleTheme());
  }

  // Theme Controller Routines
  initTheme() {
    const savedTheme = localStorage.getItem('campusflow_theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      this.updateThemeUI(true);
    } else {
      this.updateThemeUI(false);
    }
  }

  toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('campusflow_theme', isLight ? 'light' : 'dark');
    this.updateThemeUI(isLight);
    
    // Trigger store update to notify other active controllers (e.g. particles canvas)
    Store.setState({});
  }

  updateThemeUI(isLight) {
    const icon = document.getElementById('theme-toggle-icon');
    const text = document.getElementById('theme-toggle-text');
    
    if (icon) {
      icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      icon.style.color = isLight ? 'var(--color-warning)' : 'var(--text-secondary)';
    }
    if (text) {
      text.innerText = isLight ? 'Light Mode' : 'Dark Mode';
    }
  }

  initStoreListeners() {
    // Subscribe to state triggers to render dynamic Dashboard updates
    Store.subscribe((state, user) => {
      if (!user) return; // Ignore if logged out

      // Initialize feature controllers on first login success
      this.lazyLoadControllers();

      // Render Header Details & Initials
      const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      
      const avatarBadge = document.getElementById('nav-user-avatar');
      if (avatarBadge) {
        avatarBadge.innerText = initials;
      }
      const navUserName = document.getElementById('nav-user-name');
      if (navUserName) {
        navUserName.innerText = user.fullName;
      }
      const greetName = document.getElementById('dash-greeting-name');
      if (greetName) {
        greetName.innerText = user.fullName.split(' ')[0]; // First name only
      }

      // Update Date Header
      const liveDateText = document.getElementById('dash-live-date');
      if (liveDateText) {
        const dOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        liveDateText.innerText = new Date().toLocaleDateString(undefined, dOptions);
      }

      // Profile View Updates
      const profileAvatar = document.getElementById('profile-avatar-char');
      if (profileAvatar) profileAvatar.innerText = initials;
      const profileName = document.getElementById('profile-full-name');
      if (profileName) profileName.innerText = user.fullName;
      const profileEmail = document.getElementById('profile-email-addr');
      if (profileEmail) profileEmail.innerText = user.email;

      // Primary Dashboard Metric Computations
      this.updateDashboardMetrics(state);
      
      // Render Profile Page Course Control List
      this.renderProfileSubjects(state);
    });
  }

  // Instantiate feature logic on success
  lazyLoadControllers() {
    if (!this.assignmentsController) {
      this.assignmentsController = new AssignmentsController();
      this.attendanceController = new AttendanceController();
      this.notesController = new NotesController();
    }
  }

  // Tab switching routing engine
  switchTab(tabName) {
    this.activeTab = tabName;
    
    // Toggle active menu indicators
    const navButtons = document.querySelectorAll('.nav-item-btn[data-tab]');
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle active views
    const viewSections = document.querySelectorAll('.view-section');
    viewSections.forEach(section => {
      if (section.id === `view-${tabName}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Scroll back to top smoothly when switching views
    const scrollPanel = document.getElementById('content-panel');
    if (scrollPanel) scrollPanel.scrollTop = 0;
  }

  // Dashboard Aggregates & Alerts Compiler
  updateDashboardMetrics(state) {
    const { assignments, attendance, notes } = state;
    
    const now = new Date();
    const todayStr = now.toDateString();

    // 1. Calculate active uncompleted tasks due today
    const tasksToday = assignments.filter(task => {
      if (task.completed) return false;
      const tDate = new Date(task.deadline);
      return tDate.toDateString() === todayStr;
    }).length;

    // 2. Count total pending tasks
    const pendingTotal = assignments.filter(task => !task.completed).length;

    // 3. Saved notes count
    const notesCount = notes.length;

    // 4. Overall average attendance calculation
    let totalAttendedSum = 0;
    let totalClassesSum = 0;
    Object.values(attendance).forEach(rec => {
      totalAttendedSum += rec.attended || 0;
      totalClassesSum += rec.total || 0;
    });
    
    const avgAttendance = totalClassesSum > 0 
      ? Math.round((totalAttendedSum / totalClassesSum) * 100) 
      : 100;

    // Render Stats Strip
    const tTodayElem = document.getElementById('stat-tasks-today');
    if (tTodayElem) tTodayElem.innerText = tasksToday;

    const tPendElem = document.getElementById('stat-pending-total');
    if (tPendElem) tPendElem.innerText = pendingTotal;

    const notesElem = document.getElementById('stat-notes-saved');
    if (notesElem) notesElem.innerText = notesCount;

    const attElem = document.getElementById('stat-avg-attendance');
    if (attElem) {
      attElem.innerText = `${avgAttendance}%`;
      // Render color classes depending on metrics
      attElem.style.color = avgAttendance >= 85 ? 'var(--color-success)' : (avgAttendance >= 75 ? 'var(--color-warning)' : 'var(--color-danger)');
    }

    // Render stats inside profile tab
    const profTaskDone = document.getElementById('profile-stat-completed');
    if (profTaskDone) {
      profTaskDone.innerText = assignments.filter(task => task.completed).length;
    }
    const profAtt = document.getElementById('profile-stat-attendance');
    if (profAtt) {
      profAtt.innerText = `${avgAttendance}%`;
      profAtt.style.color = avgAttendance >= 85 ? 'var(--color-success)' : (avgAttendance >= 75 ? 'var(--color-warning)' : 'var(--color-danger)');
    }

    // Compile Dashboard Feeds
    this.compileDashboardUrgentFeed(assignments);
    this.compileDashboardAlertsFeed(attendance);
  }

  // Compile Urgent Deadlines due in next 3 days
  compileDashboardUrgentFeed(assignments) {
    const feed = document.getElementById('dash-schedule-feed');
    if (!feed) return;

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    // Filter uncompleted tasks due within next 72 hours
    const urgentTasks = assignments.filter(task => {
      if (task.completed) return false;
      const tDeadline = new Date(task.deadline);
      return tDeadline >= now && tDeadline <= threeDaysFromNow;
    }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (urgentTasks.length === 0) {
      feed.innerHTML = `
        <div class="empty-state" style="padding: 32px 16px;">
          <i class="fa-solid fa-circle-check" style="color: var(--color-success);" aria-hidden="true"></i>
          <h3>All Scheduled Clean!</h3>
          <p>No upcoming assignments due in next 3 days.</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = urgentTasks.map(task => {
      const hoursLeft = Math.round((new Date(task.deadline) - now) / (1000 * 60 * 60));
      const hoursDesc = hoursLeft <= 24 ? `${hoursLeft} hours remaining!` : `${Math.ceil(hoursLeft / 24)} days left`;
      
      const relativeColor = hoursLeft <= 24 ? 'var(--color-danger)' : 'var(--color-warning)';
      const dOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      const formatted = new Date(task.deadline).toLocaleDateString(undefined, dOptions);

      return `
        <div class="alert-banner warning" style="border-left-color: ${relativeColor}; background: rgba(255,255,255,0.015); border: var(--border-glass);">
          <div class="alert-banner-icon" style="color: ${relativeColor}">
            <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
          </div>
          <div style="flex-grow: 1;">
            <div class="alert-banner-title" style="display:flex; justify-content:space-between; align-items:center;">
              <span>${task.title}</span>
              <span class="subject-badge" style="font-size: 9px; padding: 2px 6px;">${task.subject}</span>
            </div>
            <div class="alert-banner-desc" style="display:flex; justify-content:space-between; align-items:center; margin-top: 6px;">
              <span>Due: ${formatted}</span>
              <strong style="color: ${relativeColor}">${hoursDesc}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Compile subjects below 75% attendance
  compileDashboardAlertsFeed(attendance) {
    const feed = document.getElementById('dash-alerts-feed');
    if (!feed) return;

    const dangerSubjects = [];
    Object.entries(attendance).forEach(([subject, record]) => {
      const percentage = record.total > 0 ? (record.attended / record.total) * 100 : 100;
      if (percentage < 75) {
        dangerSubjects.push({
          subject,
          percentage: Math.round(percentage),
          attended: record.attended,
          total: record.total,
          needed: Math.max(1, 3 * record.total - 4 * record.attended)
        });
      }
    });

    if (dangerSubjects.length === 0) {
      feed.innerHTML = `
        <div class="empty-state" style="padding: 32px 16px;">
          <i class="fa-solid fa-circle-check" style="color: var(--color-success);" aria-hidden="true"></i>
          <h3>Attendance Optimal</h3>
          <p>All classes satisfy minimum 75% attendance limits.</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = dangerSubjects.map(item => `
      <div class="alert-banner danger">
        <div class="alert-banner-icon">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        </div>
        <div style="flex-grow: 1;">
          <div class="alert-banner-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>${item.subject} Attendance Danger</span>
            <strong style="color: var(--color-danger); font-size:15px;">${item.percentage}%</strong>
          </div>
          <div class="alert-banner-desc" style="margin-top: 4px;">
            Current: ${item.attended}/${item.total} classes. You must attend the next <strong>${item.needed}</strong> consecutive classes to secure 75% status.
          </div>
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button class="btn-log-attendance present" style="background: rgba(16,185,129,0.06); padding: 4px 10px; font-size: 11px;" data-dash-attended="${item.subject}">
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Attended Class
            </button>
            <button class="btn-log-attendance absent" style="background: rgba(244,63,94,0.06); padding: 4px 10px; font-size: 11px;" data-dash-missed="${item.subject}">
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Missed Class
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Hook quick logs inside dashboard alert banners
    dangerSubjects.forEach(item => {
      feed.querySelector(`button[data-dash-attended="${item.subject}"]`)?.addEventListener('click', () => {
        this.attendanceController.logAttended(item.subject);
      });
      feed.querySelector(`button[data-dash-missed="${item.subject}"]`)?.addEventListener('click', () => {
        this.attendanceController.logMissed(item.subject);
      });
    });
  }

  // Render Subject control lists inside Settings tab
  renderProfileSubjects(state) {
    const listContainer = document.getElementById('profile-subject-list');
    if (!listContainer) return;

    const { subjects } = state;

    if (subjects.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 13px; color: var(--text-muted);">No active courses registered.</div>`;
      return;
    }

    listContainer.innerHTML = subjects.map(sub => `
      <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 14px; border-radius: var(--radius-sm);">
        <span style="font-size: 14px; font-weight: 500;">${sub}</span>
        <button class="delete-task-btn" data-profile-delete-sub="${sub}" title="Unregister Course" aria-label="Remove Course">
          <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
        </button>
      </div>
    `).join('');

    // Attach deletion clicks
    listContainer.querySelectorAll('button[data-profile-delete-sub]').forEach(button => {
      button.addEventListener('click', (e) => {
        const subName = e.currentTarget.getAttribute('data-profile-delete-sub');
        this.deleteSubject(subName);
      });
    });
  }

  // Remove subject alongside notes/assignments cleaning
  deleteSubject(subjectName) {
    const confirmMsg = `Are you sure you want to remove "${subjectName}"?\n\nThis will also remove:\n- All attendance history for this course\n- All associated assignments\n- All associated study notes\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMsg)) {
      Store.setState(state => {
        // Clean assignments
        const nextAssignments = state.assignments.filter(item => item.subject !== subjectName);
        
        // Clean notes
        const nextNotes = state.notes.filter(note => note.subject !== subjectName);

        // Clean attendance
        const nextAttendance = { ...state.attendance };
        delete nextAttendance[subjectName];

        // Clean subjects array
        const nextSubjects = state.subjects.filter(sub => sub !== subjectName);

        return {
          subjects: nextSubjects,
          assignments: nextAssignments,
          attendance: nextAttendance,
          notes: nextNotes
        };
      });
    }
  }

  // Bounding rect fallback light-dismiss click listener for dialog overlays
  initDialogBackdropsDismiss() {
    const dialogs = document.querySelectorAll('dialog');
    
    dialogs.forEach(dialog => {
      // Native closedBy detection
      if (!('closedBy' in HTMLDialogElement.prototype)) {
        dialog.addEventListener('click', (event) => {
          // If click was triggered strictly on backdrop container bounds
          if (event.target !== dialog) return;

          const rect = dialog.getBoundingClientRect();
          const isDialogContent = (
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width
          );

          if (isDialogContent) return;

          // Close modal manually
          dialog.close();
        });
      }
    });
  }
}

// Safe Bootstrapper initialization
const bootApp = () => {
  const coordinator = new AppCoordinator();
  coordinator.boot();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
