/**
 * Snèh AI — Neuro-Aesthetic Visual Engine (N.A.V.E.) Patch
 * Standalone Runtime Wrapper (Zero original files modified)
 */
(function() {
  // 1. INJECT NEURO-AESTHETIC STYLING
  const style = document.createElement('style');
  style.textContent = `
    .settings-profile-hero {
      position: relative !important;
      overflow: hidden !important;
      background: var(--hero-bg-override, #05050a) !important;
      border: 1px solid var(--input-border-color) !important;
      transition: background 0.8s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    /* Container for the dynamic canvas */
    .fluid-gradient-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      /* CSS Heavy Blur creates the organic watercolor bleeding effect */
      filter: blur(35px) contrast(1.15); 
      transform: translate3d(0, 0, 0);
      pointer-events: none;
      z-index: 1;
    }

    /* Smooth transition for the opacity of the canvas */
    .fluid-gradient-wrapper canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: var(--gradient-opacity, 0.85);
      transition: opacity 0.8s ease;
    }
  `;
  document.head.appendChild(style);

  // 2. STATE CONTROLLERS
  let isAnimating = false;
  let animationFrameId = null;
  let activeCanvas = null;

  // 3. THE CORE PHYSICS ENGINE
  function launchNeuroEngine(hero) {
    if (isAnimating) return;

    // Inject the canvas container if missing
    let wrapper = hero.querySelector('.fluid-gradient-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'fluid-gradient-wrapper';
      wrapper.innerHTML = `<canvas></canvas>`;
      hero.insertBefore(wrapper, hero.firstChild);

      // Force profile texts & avatars to sit beautifully on top of the fluid
      Array.from(hero.children).forEach(child => {
        if (child !== wrapper) {
          child.style.position = 'relative';
          child.style.zIndex = '2';
          const title = child.querySelector('.hero-name');
          if (title) {
            title.style.textShadow = '0 2px 12px rgba(0,0,0,0.45)';
            title.style.transition = 'color 0.8s ease';
          }
        }
      });
    }

    const canvas = wrapper.querySelector('canvas');
    activeCanvas = canvas;
    const ctx = canvas.getContext('2d');

    // Scale down back-buffer resolution to save mobile GPU/CPU resources
    const setCanvasResolution = () => {
      canvas.width = 300;
      canvas.height = 150;
    };
    setCanvasResolution();

    // Neuro-aesthetic system parameters
    let time = 0;
    let pointer = { active: false, x: 150, y: 75, vx: 0, vy: 0 };
    let currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

    // State definitions: 'AIR', 'LIQUID', 'GLASS', 'RIGID', 'GALAXY'
    let matterState = 'AIR';
    let stateTimer = 0;

    // Color definitions
    const colorThemes = {
      dark: {
        bg: '#040409',
        blobs: [
          { r: 138, g: 43,  b: 226 }, // Royal Violet (Dopaminergic Focus)
          { r: 255, g: 0,   b: 127 }, // Orchid Rose (Novelty Stimulation)
          { r: 0,   g: 240, b: 255 }, // Cyan Spark (Cognitive Clarity)
          { r: 255, g: 170, b: 0   }  // Deep Amber (Circadian Comfort)
        ],
        particleColor: 'rgba(255, 255, 255, 0.4)'
      },
      light: {
        bg: '#f5f7fc',
        blobs: [
          { r: 170, g: 140, b: 255 }, // Pastel Violet
          { r: 255, g: 130, b: 180 }, // Pastel Rose
          { r: 120, g: 220, b: 255 }, // Pastel Sky
          { r: 255, g: 210, b: 130 }  // Pastel Sand
        ],
        particleColor: 'rgba(11, 87, 207, 0.2)'
      }
    };

    // Initialize physical color elements
    const blobs = [
      { x: 60,  y: 40,  vx: 0, vy: 0, tx: 60,  ty: 40,  radius: 80,  targetRad: 80 },
      { x: 240, y: 110, vx: 0, vy: 0, tx: 240, ty: 110, radius: 80,  targetRad: 80 },
      { x: 90,  y: 110, vx: 0, vy: 0, tx: 90,  ty: 110, radius: 70,  targetRad: 70 },
      { x: 210, y: 40,  vx: 0, vy: 0, tx: 210, ty: 40,  radius: 65,  targetRad: 65 }
    ];

    // Accretion disk/stardust particles for cosmic state
    const particles = [];
    for (let i = 0; i < 24; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        distance: 20 + Math.random() * 80,
        speed: 0.01 + Math.random() * 0.02,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.1 + Math.random() * 0.5
      });
    }

    // Pointer coordinates
    const updatePointer = (e) => {
      const rect = hero.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      // Convert to canvas space
      pointer.x = (rawX / rect.width) * canvas.width;
      pointer.y = (rawY / rect.height) * canvas.height;
      pointer.active = true;
    };

    hero.addEventListener('pointermove', updatePointer);
    hero.addEventListener('pointerleave', () => pointer.active = false);
    hero.addEventListener('touchstart', (e) => {
      const rect = hero.getBoundingClientRect();
      const touch = e.touches[0];
      pointer.x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
      pointer.y = ((touch.clientY - rect.top) / rect.height) * canvas.height;
      pointer.active = true;
    }, { passive: true });
    hero.addEventListener('touchend', () => pointer.active = false);

    isAnimating = true;

    // Fluid dynamics core algorithm
    function drawFrame() {
      if (!isAnimating) return;

      currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const themeConfig = colorThemes[currentTheme];

      // Update baseline CSS variables dynamically based on active theme
      hero.style.setProperty('--hero-bg-override', themeConfig.bg);
      hero.style.setProperty('--gradient-opacity', currentTheme === 'dark' ? '0.85' : '0.50');

      ctx.fillStyle = themeConfig.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 0.005;
      stateTimer++;

      // Cycle matter states to mimic consciousness
      if (stateTimer > 700) {
        const states = ['AIR', 'LIQUID', 'GLASS', 'RIGID', 'GALAXY'];
        const currentIdx = states.indexOf(matterState);
        matterState = states[(currentIdx + 1) % states.length];
        stateTimer = 0;
      }

      // Physics variables modulated by state
      let viscosity = 0.93; // Resistance
      let tension = 0.012;  // Spring elasticity
      let wander = 0.4;     // Random kinetic drift

      if (matterState === 'GLASS') {
        viscosity = 0.98; // Glacial flow
        tension = 0.002;
        wander = 0.05;
      } else if (matterState === 'AIR') {
        viscosity = 0.88; // Highly volatile air-gas flow
        tension = 0.025;
        wander = 1.2;
      } else if (matterState === 'RIGID') {
        viscosity = 0.85; // Sharp crystalline locking
        tension = 0.08;
        wander = 0.0;
      }

      const activeColors = themeConfig.blobs;

      // Update color blobs
      blobs.forEach((blob, idx) => {
        const offset = idx * Math.PI * 0.5;

        if (matterState === 'RIGID') {
          // Lock positions into a symmetrical crystalline matrix
          const matrix = [
            { x: 75,  y: 75 },
            { x: 225, y: 75 },
            { x: 150, y: 35 },
            { x: 150, y: 115 }
          ];
          blob.tx = matrix[idx].x + Math.sin(time * 5 + idx) * 1.5;
          blob.ty = matrix[idx].y + Math.cos(time * 5 + idx) * 1.5;
          blob.targetRad = 55;
        } else if (matterState === 'GALAXY') {
          // Swirling orbit around the dynamic center gravity well
          const centerX = pointer.active ? pointer.x : 150;
          const centerY = pointer.active ? pointer.y : 75;
          const rotSpeed = 0.5 + (idx * 0.2);
          const radius = 40 + (idx * 20);
          blob.tx = centerX + Math.cos(time * rotSpeed) * radius;
          blob.ty = centerY + Math.sin(time * rotSpeed) * radius;
          blob.targetRad = 60 - (idx * 5);
        } else {
          // Default fluid breathing dynamics
          blob.tx = 150 + Math.sin(time + offset) * 95;
          blob.ty = 75 + Math.cos(time * 0.85 + offset) * 45;
          blob.targetRad = blob.targetRad = idx % 2 === 0 ? 80 : 65;
        }

        // Apply mouse/finger physics displacement
        if (pointer.active && matterState !== 'GALAXY') {
          const dx = pointer.x - blob.x;
          const dy = pointer.y - blob.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 60) {
            const pull = (60 - dist) * (matterState === 'RIGID' ? 0.005 : 0.015);
            blob.vx += dx * pull;
            blob.vy += dy * pull;
          }
        }

        // Apply Spring-Damper physics
        const ax = (blob.tx - blob.x) * tension;
        const ay = (blob.ty - blob.y) * tension;

        blob.vx += ax + (Math.random() - 0.5) * wander;
        blob.vy += ay + (Math.random() - 0.5) * wander;

        blob.vx *= viscosity;
        blob.vy *= viscosity;

        blob.x += blob.vx;
        blob.y += blob.vy;

        // Soft scale updates
        blob.radius += (blob.targetRad - blob.radius) * 0.05;

        // Render each blended glow node
        const color = activeColors[idx];
        const radGrad = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, Math.max(1, blob.radius)
        );
        radGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
        radGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

        ctx.beginPath();
        ctx.fillStyle = radGrad;
        ctx.arc(blob.x, blob.y, Math.max(1, blob.radius), 0, Math.PI * 2);
        ctx.fill();
      });

      // Swirl stardust if in cosmic accretion state
      if (matterState === 'GALAXY') {
        const originX = pointer.active ? pointer.x : 150;
        const originY = pointer.active ? pointer.y : 75;

        particles.forEach(p => {
          p.angle += p.speed;
          const px = originX + Math.cos(p.angle) * p.distance;
          const py = originY + Math.sin(p.angle) * p.distance;

          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = themeConfig.particleColor;
          ctx.fill();
        });
      }

      animationFrameId = requestAnimationFrame(drawFrame);
    }

    drawFrame();
  }

  // Deactivate render loops to save performance
  function haltNeuroEngine() {
    isAnimating = false;
    if (heroAnimFrameId) {
      cancelAnimationFrame(heroAnimFrameId);
      heroAnimFrameId = null;
    }
    activeCanvas = null;
  }

  // 4. INTELLIGENT RUNTIME DOM OBSERVER
  document.addEventListener('DOMContentLoaded', () => {
    const profileModal = document.getElementById('profile-modal');
    if (!profileModal) return;

    const observer = new MutationObserver(() => {
      const isVisible = profileModal.style.display === 'flex';
      const heroElement = profileModal.querySelector('.settings-profile-hero');

      if (isVisible && heroElement) {
        launchNeuroEngine(heroElement);
      } else {
        haltNeuroEngine();
      }
    });

    observer.observe(profileModal, {
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
      subtree: true
    });
  });
})();