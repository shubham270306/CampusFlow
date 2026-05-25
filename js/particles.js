// CampusFlow Interactive Zero-Gravity Canvas Particle Background
import { Store } from './store.js';

export class ParticleEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    
    // Mouse interaction states
    this.mouse = {
      x: null,
      y: null,
      radius: 150 // Connection and repulsion radius
    };

    this.maxParticles = 80;
    this.connectionDistance = 100;
    this.theme = 'dark'; // 'dark' or 'light'

    this.init();
  }

  init() {
    this.resizeCanvas();
    this.createParticles();
    this.attachListeners();
    this.animate();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    const color = this.theme === 'dark' ? 'rgba(99, 102, 241, 0.45)' : 'rgba(99, 102, 241, 0.25)';

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.35, // slow zero-g drift
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 2.5 + 1,
        color: color,
        // Save initial velocities to restore after mouse repulsion
        baseVx: null,
        baseVy: null
      });
    }
  }

  attachListeners() {
    // Mouse hover coordinates
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    // Reset mouse when cursor leaves screen
    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    // Handle screen resize responsive bounds
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.createParticles();
    });

    // Watch for theme shifts
    Store.subscribe(() => {
      const activeTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
      if (activeTheme !== this.theme) {
        this.theme = activeTheme;
        // Update particles colors
        const color = this.theme === 'dark' ? 'rgba(99, 102, 241, 0.45)' : 'rgba(99, 102, 241, 0.25)';
        this.particles.forEach(p => {
          p.color = color;
        });
      }
    });
  }

  // Perform full drawing updates on screen refresh
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Zero-Gravity Drift updates
      p.x += p.vx;
      p.y += p.vy;

      // Elastic Viewport boundary collisions
      if (p.x < 0 || p.x > this.canvas.width) p.vx = -p.vx;
      if (p.y < 0 || p.y > this.canvas.height) p.vy = -p.vy;

      // Mouse repulsion physics (Antigravity cursor repulsion)
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.mouse.radius) {
          // Calculate push vector
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          const angle = Math.atan2(dy, dx);
          
          // Gently accelerate away from cursor
          p.x += Math.cos(angle) * force * 1.5;
          p.y += Math.sin(angle) * force * 1.5;
        }
      }

      // Draw Particle Node
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();

      // Inter-particle linking lines (Organic Connection Grid)
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.connectionDistance) {
          // Fade connection opacity based on distance
          const opacity = (this.connectionDistance - dist) / this.connectionDistance * 0.15;
          
          // Draw connecting webs
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          
          // Color based on active visual modes
          if (this.theme === 'dark') {
            this.ctx.strokeStyle = `rgba(168, 85, 247, ${opacity})`; // Violet connection in dark mode
          } else {
            this.ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`; // Indigo connection in light mode
          }
          
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }

      // Draw faint connections directly to mouse cursor if within radius
      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.mouse.radius) {
          const opacity = (this.mouse.radius - dist) / this.mouse.radius * 0.12;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.strokeStyle = this.theme === 'dark' ? `rgba(6, 182, 212, ${opacity})` : `rgba(6, 182, 212, ${opacity * 2.5})`; // cyan hover string
          this.ctx.lineWidth = 0.6;
          this.ctx.stroke();
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}
