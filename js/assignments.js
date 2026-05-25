// CampusFlow Assignments Controller
import { Store } from './store.js';

export class AssignmentsController {
  constructor() {
    this.container = document.getElementById('assignments-card-grid');
    this.form = document.getElementById('form-add-assignment');
    this.filterButtons = document.querySelectorAll('.tracker-filters .filter-btn');
    
    this.currentFilter = 'all'; // 'all', 'pending', 'completed', 'high'
    
    this.init();
  }

  init() {
    // Listen for form submissions to create new assignments
    this.form?.addEventListener('submit', (e) => this.handleCreateAssignment(e));

    // Listen for filter buttons clicks
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.getAttribute('data-filter');
        this.render();
      });
    });

    // Subscribing to Store changes for auto-re-rendering
    Store.subscribe(() => {
      this.populateSubjectSelects();
      this.render();
    });

    // Initial population of select options
    this.populateSubjectSelects();
  }

  // Auto-populate select options when subjects change
  populateSubjectSelects() {
    const selectElement = document.getElementById('assign-subject');
    if (!selectElement) return;

    const { subjects } = Store.getState();
    const currentSelection = selectElement.value;
    
    selectElement.innerHTML = subjects.map(sub => `
      <option value="${sub}">${sub}</option>
    `).join('');

    if (currentSelection && subjects.includes(currentSelection)) {
      selectElement.value = currentSelection;
    }
  }

  // Handle new assignment creation
  handleCreateAssignment(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('assign-title');
    const subjectInput = document.getElementById('assign-subject');
    const priorityInput = document.getElementById('assign-priority');
    const deadlineInput = document.getElementById('assign-deadline');

    if (!titleInput || !subjectInput || !priorityInput || !deadlineInput) return;

    const newAssignment = {
      id: 'task-' + Math.random().toString(36).substr(2, 9),
      title: titleInput.value.trim(),
      subject: subjectInput.value,
      priority: priorityInput.value,
      deadline: new Date(deadlineInput.value).toISOString(),
      completed: false
    };

    // Update global state
    Store.setState(state => ({
      assignments: [newAssignment, ...state.assignments]
    }));

    // Reset Form & Close Dialog
    this.form.reset();
    const dialog = document.getElementById('modal-add-assignment');
    if (dialog) dialog.close();
  }

  // Toggle completion checkbox
  toggleAssignmentComplete(id) {
    Store.setState(state => ({
      assignments: state.assignments.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  }

  // Delete an assignment
  deleteAssignment(id) {
    if (confirm("Are you sure you want to delete this assignment?")) {
      Store.setState(state => ({
        assignments: state.assignments.filter(item => item.id !== id)
      }));
    }
  }

  // Calculate high-fidelity countdown details for deadlines
  getDeadlineStatus(deadlineISO, isCompleted) {
    if (isCompleted) {
      return { text: "Completed", isOverdue: false, isDueToday: false };
    }

    const now = new Date();
    const deadline = new Date(deadlineISO);
    const diffMs = deadline - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffHours / 24);

    const timeOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const formattedDate = deadline.toLocaleDateString(undefined, timeOptions);

    if (diffMs < 0) {
      return {
        text: `Overdue (${formattedDate})`,
        isOverdue: true,
        isDueToday: false
      };
    }

    // Check if the deadline falls on the same calendar day
    const isToday = now.toDateString() === deadline.toDateString();
    if (isToday) {
      return {
        text: `Due Today at ${deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        isOverdue: false,
        isDueToday: true
      };
    }

    if (diffHours <= 24) {
      const hoursLeft = Math.max(1, Math.round(diffHours));
      return {
        text: `Due in ${hoursLeft} hr${hoursLeft > 1 ? 's' : ''} (${formattedDate})`,
        isOverdue: false,
        isDueToday: true
      };
    }

    return {
      text: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''} (${formattedDate})`,
      isOverdue: false,
      isDueToday: false
    };
  }

  // Main visual renderer
  render() {
    if (!this.container) return;

    const { assignments } = Store.getState();
    
    // Apply dynamic category filter matches
    let filteredList = assignments;
    if (this.currentFilter === 'pending') {
      filteredList = assignments.filter(a => !a.completed);
    } else if (this.currentFilter === 'completed') {
      filteredList = assignments.filter(a => a.completed);
    } else if (this.currentFilter === 'high') {
      filteredList = assignments.filter(a => a.priority === 'high' && !a.completed);
    }

    if (filteredList.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-list-check" aria-hidden="true"></i>
          <h3>No Assignments Found</h3>
          <p>No tasks fit your current selection criteria. Add new tasks to get started!</p>
        </div>
      `;
      return;
    }

    // Map tasks to glass components
    this.container.innerHTML = filteredList.map(item => {
      const deadlineDetails = this.getDeadlineStatus(item.deadline, item.completed);
      
      let overdueClass = deadlineDetails.isOverdue ? 'overdue' : '';
      let activePulseClass = (deadlineDetails.isDueToday && !item.completed) ? 'pulse-warning' : '';
      let completedClass = item.completed ? 'completed' : '';

      return `
        <div class="glass-card assignment-card ${overdueClass} ${completedClass} ${activePulseClass}" data-id="${item.id}">
          <div class="assignment-header">
            <span class="subject-badge">${item.subject}</span>
            <span class="priority-indicator ${item.priority}">${item.priority}</span>
          </div>

          <h3 class="assignment-title">${item.title}</h3>

          <div class="assignment-deadline-row">
            <i class="fa-regular fa-clock" aria-hidden="true"></i>
            <span>${deadlineDetails.text}</span>
          </div>

          <div class="assignment-actions">
            <label class="checkbox-container">
              <input type="checkbox" ${item.completed ? 'checked' : ''} data-toggle-id="${item.id}">
              <span class="checkmark"></span>
              Mark Completed
            </label>
            <button class="delete-task-btn" data-delete-id="${item.id}" title="Remove Task" aria-label="Remove Task">
              <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.attachCardEventListeners();
  }

  attachCardEventListeners() {
    // Checkbox completions toggling
    this.container.querySelectorAll('input[data-toggle-id]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-toggle-id');
        this.toggleAssignmentComplete(id);
      });
    });

    // Delete icons triggers
    this.container.querySelectorAll('button[data-delete-id]').forEach(button => {
      button.addEventListener('click', (e) => {
        // Handle nested icon click properly
        const btn = e.target.closest('button[data-delete-id]');
        const id = btn.getAttribute('data-delete-id');
        this.deleteAssignment(id);
      });
    });
  }
}
