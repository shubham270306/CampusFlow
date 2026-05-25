// CampusFlow Notes & Resources Controller
import { Store } from './store.js';

export class NotesController {
  constructor() {
    this.gridContainer = document.getElementById('notes-card-grid');
    this.categoryContainer = document.getElementById('notes-category-list');
    this.searchInput = document.getElementById('notes-search-query');
    this.form = document.getElementById('form-add-note');
    
    this.activeSubjectFilter = 'all'; // 'all' or specific subject name
    this.searchQuery = '';

    this.init();
  }

  init() {
    // Listen for form submissions to create new notes
    this.form?.addEventListener('submit', (e) => this.handleCreateNote(e));

    // Listen for real-time keystrokes in search bar
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.render();
    });

    // Subscribing to Store updates
    Store.subscribe(() => {
      this.populateSubjectSelects();
      this.render();
    });

    // Initial population of select options
    this.populateSubjectSelects();
  }

  // Populate note dialog dropdowns
  populateSubjectSelects() {
    const selectElement = document.getElementById('note-subject');
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

  // Handle note submission & URL parsing
  handleCreateNote(e) {
    e.preventDefault();

    const titleInput = document.getElementById('note-title');
    const subjectInput = document.getElementById('note-subject');
    const contentInput = document.getElementById('note-content');
    const linkNameInput = document.getElementById('note-link-name');
    const linkUrlInput = document.getElementById('note-link-url');

    if (!titleInput || !subjectInput || !contentInput) return;

    const links = [];
    const nameVal = linkNameInput?.value.trim();
    let urlVal = linkUrlInput?.value.trim();

    if (urlVal) {
      // Clean and prepend standard schema if omitted
      if (!/^https?:\/\//i.test(urlVal)) {
        urlVal = 'https://' + urlVal;
      }
      links.push({
        name: nameVal || "Associated Resource",
        url: urlVal
      });
    }

    const newNote = {
      id: 'note-' + Math.random().toString(36).substr(2, 9),
      title: titleInput.value.trim(),
      subject: subjectInput.value,
      content: contentInput.value.trim(),
      links: links,
      updatedAt: new Date().toISOString()
    };

    Store.setState(state => ({
      notes: [newNote, ...state.notes]
    }));

    // Reset Form and close modal
    this.form.reset();
    const dialog = document.getElementById('modal-add-note');
    if (dialog) dialog.close();
  }

  // Delete note
  deleteNote(id) {
    if (confirm("Are you sure you want to delete this note?")) {
      Store.setState(state => ({
        notes: state.notes.filter(n => n.id !== id)
      }));
    }
  }

  // Render subject pill buttons list with item counters
  renderCategories() {
    if (!this.categoryContainer) return;

    const { subjects, notes } = Store.getState();
    
    // Calculate note counts per course
    const counts = { all: notes.length };
    subjects.forEach(sub => {
      counts[sub] = notes.filter(n => n.subject === sub).length;
    });

    let categoryHTML = `
      <button class="category-pill-btn ${this.activeSubjectFilter === 'all' ? 'active' : ''}" data-notes-sub="all">
        <span>All Courses</span>
        <span class="category-count">${counts.all}</span>
      </button>
    `;

    categoryHTML += subjects.map(sub => `
      <button class="category-pill-btn ${this.activeSubjectFilter === sub ? 'active' : ''}" data-notes-sub="${sub}">
        <span>${sub}</span>
        <span class="category-count">${counts[sub] || 0}</span>
      </button>
    `).join('');

    this.categoryContainer.innerHTML = categoryHTML;

    // Attach category clicks listeners
    this.categoryContainer.querySelectorAll('button[data-notes-sub]').forEach(button => {
      button.addEventListener('click', (e) => {
        const sub = e.target.closest('button[data-notes-sub]').getAttribute('data-notes-sub');
        this.activeSubjectFilter = sub;
        this.render();
      });
    });
  }

  // Render the primary notes grid
  render() {
    // Render side pills first
    this.renderCategories();

    if (!this.gridContainer) return;

    const { notes } = Store.getState();

    // 1. Apply Subject Filter
    let filteredList = notes;
    if (this.activeSubjectFilter !== 'all') {
      filteredList = notes.filter(n => n.subject === this.activeSubjectFilter);
    }

    // 2. Apply Search Filter
    if (this.searchQuery) {
      filteredList = filteredList.filter(n => 
        n.title.toLowerCase().includes(this.searchQuery) ||
        n.content.toLowerCase().includes(this.searchQuery)
      );
    }

    if (filteredList.length === 0) {
      this.gridContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-note-sticky" aria-hidden="true"></i>
          <h3>No Notes Found</h3>
          <p>Create study summaries or upload reference links to build your knowledge base.</p>
        </div>
      `;
      return;
    }

    // Map notes to cards
    this.gridContainer.innerHTML = filteredList.map(note => {
      const timeStr = new Date(note.updatedAt).toLocaleDateString(undefined, { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      const linksHTML = note.links && note.links.length > 0 ? `
        <div class="note-resources-section">
          <div class="note-resources-lbl">Resources</div>
          ${note.links.map(lnk => `
            <a href="${lnk.url}" target="_blank" rel="noopener noreferrer" class="note-resource-link">
              <i class="fa-solid fa-link" aria-hidden="true"></i> ${lnk.name}
            </a>
          `).join('')}
        </div>
      ` : '';

      return `
        <div class="glass-card note-card" data-id="${note.id}">
          <div class="note-header">
            <span class="subject-badge">${note.subject}</span>
            <span class="note-date">${timeStr}</span>
          </div>

          <h3 class="note-title">${note.title}</h3>
          <p class="note-body">${note.content}</p>

          ${linksHTML}

          <div class="note-actions">
            <button class="delete-task-btn" data-delete-note-id="${note.id}" title="Delete Note" aria-label="Delete Note">
              <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.attachCardEventListeners();
  }

  attachCardEventListeners() {
    this.gridContainer.querySelectorAll('button[data-delete-note-id]').forEach(button => {
      button.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-delete-note-id]');
        const id = btn.getAttribute('data-delete-note-id');
        this.deleteNote(id);
      });
    });
  }
}
