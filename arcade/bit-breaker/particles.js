/**
 * Bit Breaker - Particle System
 * Handles explosions and trail effects.
 */

class Particle {
  constructor(x, y, color, speed, size) {
    this.x = x;
    this.y = y;
    this.color = color;
    
    // Random velocity based on speed
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * speed;
    this.vx = Math.cos(angle) * velocity;
    this.vy = Math.sin(angle) * velocity;
    
    this.size = Math.random() * size + 1;
    this.life = 1.0;
    this.decay = Math.random() * 0.02 + 0.02;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    // Glow effect
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, color, count, speed = 4, size = 3) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color, speed, size));
    }
  }
  
  createTrail(x, y, color) {
    // Smaller, slower particles for trails
    this.particles.push(new Particle(x, y, color, 1, 2));
    this.particles[this.particles.length - 1].decay = 0.05;
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }
}
