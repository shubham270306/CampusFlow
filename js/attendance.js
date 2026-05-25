// CampusFlow Attendance Controller
import { Store } from './store.js';

export class AttendanceController {
  constructor() {
    this.container = document.getElementById('attendance-card-grid');
    this.form = document.getElementById('form-add-subject');
    
    this.init();
  }

  init() {
    // Listen for form submissions to add a new subject
    this.form?.addEventListener('submit', (e) => this.handleCreateSubject(e));

    // Listen for global store state changes
    Store.subscribe(() => this.render());
  }

  // Handle adding a new subject to track
  handleCreateSubject(e) {
    e.preventDefault();

    const nameInput = document.getElementById('subject-name');
    const attendedInput = document.getElementById('subject-attended');
    const totalInput = document.getElementById('subject-total');

    if (!nameInput || !attendedInput || !totalInput) return;

    const subjectName = nameInput.value.trim();
    const attended = Math.max(0, parseInt(attendedInput.value) || 0);
    const total = Math.max(attended, parseInt(totalInput.value) || 0); // Total cannot be less than attended

    const { subjects, attendance } = Store.getState();

    // Prevent duplicate subjects
    if (subjects.includes(subjectName)) {
      alert("This subject is already registered.");
      return;
    }

    // Add subject name to list, and record initial attendance counts
    Store.setState(state => ({
      subjects: [...state.subjects, subjectName],
      attendance: {
        ...state.attendance,
        [subjectName]: { attended, total }
      }
    }));

    // Reset form and close dialog
    this.form.reset();
    const dialog = document.getElementById('modal-add-subject');
    if (dialog) dialog.close();
  }

  // Quick Log: log attended class (+1 present, +1 total)
  logAttended(subject) {
    const { attendance } = Store.getState();
    const current = attendance[subject] || { attended: 0, total: 0 };
    
    Store.setState({
      attendance: {
        ...attendance,
        [subject]: {
          attended: current.attended + 1,
          total: current.total + 1
        }
      }
    });
  }

  // Quick Log: log missed class (0 present, +1 total)
  logMissed(subject) {
    const { attendance } = Store.getState();
    const current = attendance[subject] || { attended: 0, total: 0 };

    Store.setState({
      attendance: {
        ...attendance,
        [subject]: {
          attended: current.attended,
          total: current.total + 1
        }
      }
    });
  }

  // Calculate advanced actionable attendance metrics
  calculateActionMetrics(attended, total) {
    if (total === 0) {
      return { status: 'optimal', text: 'No classes conducted yet.', statusClass: 'good' };
    }

    const percentage = (attended / total) * 100;
    
    if (percentage < 75) {
      // Classes to attend consecutively: (attended + x) / (total + x) >= 0.75
      // x >= 3 * total - 4 * attended
      const classesNeeded = Math.max(1, 3 * total - 4 * attended);
      return {
        status: 'danger',
        text: `Attend next <strong>${classesNeeded}</strong> class${classesNeeded > 1 ? 'es' : ''} to reach 75%.`,
        statusClass: 'danger'
      };
    } else {
      // Classes safe to skip: attended / (total + y) >= 0.75
      // y <= (4 * attended - 3 * total) / 3
      const classesSafeToSkip = Math.floor((4 * attended - 3 * total) / 3);
      if (classesSafeToSkip > 0) {
        return {
          status: 'excellent',
          text: `You can safely skip next <strong>${classesSafeToSkip}</strong> class${classesSafeToSkip > 1 ? 'es' : ''}.`,
          statusClass: 'good'
        };
      } else {
        return {
          status: 'warning',
          text: `Borderline status. Do not miss the next class!`,
          statusClass: 'warning'
        };
      }
    }
  }

  // Render visual tracker canvas
  render() {
    if (!this.container) return;

    const { subjects, attendance } = Store.getState();

    if (subjects.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-graduation-cap" aria-hidden="true"></i>
          <h3>No Subjects Registered</h3>
          <p>Please register the subjects you are taking this semester to start tracking attendance.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = subjects.map(subject => {
      const record = attendance[subject] || { attended: 0, total: 0 };
      const percentage = record.total > 0 ? Math.round((record.attended / record.total) * 100) : 100;
      
      const metrics = this.calculateActionMetrics(record.attended, record.total);
      
      // Calculate SVG stroke offset: circumference is 251.2
      const strokeOffset = 251.2 - (251.2 * percentage) / 100;
      
      // Styling flags
      const isUnderThreshold = percentage < 75;
      const borderWarningStyle = isUnderThreshold ? 'style="border-color: rgba(244,63,94,0.3);box-shadow: 0 0 15px rgba(244,63,94,0.08)"' : '';
      const strokeColor = percentage >= 85 ? 'var(--color-success)' : (percentage >= 75 ? 'var(--color-warning)' : 'var(--color-danger)');

      return `
        <div class="glass-card attendance-card" ${borderWarningStyle}>
          <div class="attendance-course-header">
            <h3 style="font-size: 18px; font-weight: 600;">${subject}</h3>
            <span class="subject-badge" style="background: rgba(99, 102, 241, 0.05); border: none; font-size: 10px;">
              Active Course
            </span>
          </div>

          <!-- SVG Circular Progress Ring -->
          <div class="attendance-circle-container">
            <svg class="attendance-svg" viewBox="0 0 90 90">
              <circle class="attendance-track-ring" cx="45" cy="45" r="40"></circle>
              <circle class="attendance-progress-ring" cx="45" cy="45" r="40" 
                style="stroke: ${strokeColor}; stroke-dashoffset: ${strokeOffset};">
              </circle>
            </svg>
            <div class="attendance-percentage">${percentage}%</div>
          </div>

          <!-- Attendance Counts Matrix -->
          <div class="attendance-stats-list">
            <div class="attendance-stat-item">
              <div class="attendance-stat-num">${record.attended}</div>
              <div class="attendance-stat-lbl">Attended</div>
            </div>
            <div class="attendance-stat-item">
              <div class="attendance-stat-num">${record.total - record.attended}</div>
              <div class="attendance-stat-lbl">Missed</div>
            </div>
            <div class="attendance-stat-item">
              <div class="attendance-stat-num">${record.total}</div>
              <div class="attendance-stat-lbl">Total</div>
            </div>
          </div>

          <!-- Dynamic Skips/Attends recommendation indicator -->
          <div class="attendance-indicator-status ${metrics.statusClass}">
            ${metrics.text}
          </div>

          <!-- Quick Increment Buttons -->
          <div class="attendance-actions-row">
            <button class="btn-log-attendance present" data-attended-sub="${subject}">
              <i class="fa-solid fa-check" aria-hidden="true"></i> Attended
            </button>
            <button class="btn-log-attendance absent" data-missed-sub="${subject}">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i> Missed
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.attachIncrementListeners();
  }

  attachIncrementListeners() {
    // Add present triggers
    this.container.querySelectorAll('button[data-attended-sub]').forEach(button => {
      button.addEventListener('click', (e) => {
        const sub = e.target.closest('button[data-attended-sub]').getAttribute('data-attended-sub');
        this.logAttended(sub);
      });
    });

    // Add absent triggers
    this.container.querySelectorAll('button[data-missed-sub]').forEach(button => {
      button.addEventListener('click', (e) => {
        const sub = e.target.closest('button[data-missed-sub]').getAttribute('data-missed-sub');
        this.logMissed(sub);
      });
    });
  }
}
