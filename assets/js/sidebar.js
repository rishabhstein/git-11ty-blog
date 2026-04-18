document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.querySelector('.toggle-sidebar');
  const focusModeButton = document.querySelector('.focus-mode-toggle');
  const sidebar = document.querySelector('.right-column');
  const overlay = document.querySelector('.overlay');
  const music = document.getElementById('sidebar-music'); 
  const focusSound = document.getElementById('focus-mode-sound');
  const body = document.body;
  const storageKey = 'focus-mode-enabled';
  const mobileFocusModeQuery = window.matchMedia('(max-width: 800px)');
  let focusTransitionTimer = null;
  let focusParticleCleanupTimer = null;
  let focusParticleLayer = null;

  function clearFocusTransitionEffects() {
    if (focusTransitionTimer) {
      clearTimeout(focusTransitionTimer);
      focusTransitionTimer = null;
    }

    if (focusParticleCleanupTimer) {
      clearTimeout(focusParticleCleanupTimer);
      focusParticleCleanupTimer = null;
    }

    if (focusParticleLayer) {
      focusParticleLayer.remove();
      focusParticleLayer = null;
    }

    body.classList.remove('focus-mode-transition');
  }

  function playAngelHarpTone() {
    if (!focusSound) return;
    focusSound.pause();
    try {
      focusSound.currentTime = 0.5;
    } catch (error) {
      // If metadata is not ready yet, the seek will be retried after load.
      focusSound.addEventListener('loadedmetadata', function handleLoadedMetadata() {
        focusSound.removeEventListener('loadedmetadata', handleLoadedMetadata);
        focusSound.currentTime = 0.5;
        focusSound.play().catch(() => {});
      }, { once: true });
      return;
    }
    focusSound.play().catch(() => {});
  }

  function spawnFocusPetals() {
    if (focusParticleLayer) {
      focusParticleLayer.remove();
    }

    const layer = document.createElement('div');
    layer.className = 'focus-mode-particles';
    layer.setAttribute('aria-hidden', 'true');

    const glyphs = ['✿', '❀', '✾', '❁', '❦', '❧', '✽', '❋'];
    const colors = [
      '#ff6aa2',
      '#ffb347',
      '#ffd966',
      '#7ee081',
      '#6ecbff',
      '#b78cff',
      '#ff8fd8',
      '#f7f2b4',
    ];
    const petals = 180;

    for (let index = 0; index < petals; index += 1) {
      const petal = document.createElement('span');
      const side = index % 2 === 0 ? 'left' : 'right';
      petal.className = `focus-mode-petal focus-mode-petal-${side}`;
      petal.textContent = glyphs[index % glyphs.length];
      const xMin = side === 'left' ? 2 : 74;
      const xMax = side === 'left' ? 26 : 98;
      petal.style.setProperty('--x', `${xMin + Math.random() * (xMax - xMin)}%`);
      const horizontalDrift = 120 + Math.random() * 120;
      petal.style.setProperty('--drift-x', `${side === 'left' ? -horizontalDrift : horizontalDrift}px`);
      petal.style.setProperty('--drift-y', `${(Math.random() * 30) - 15}px`);
      petal.style.setProperty('--spin', `${(Math.random() * 280) - 140}deg`);
      petal.style.setProperty('--scale', `${0.72 + Math.random() * 0.65}`);
      petal.style.setProperty('--duration', `${3 + Math.random() * 1.8}s`);
      petal.style.setProperty('--delay', `${Math.random() * 1.2}s`);
      petal.style.setProperty('--start-y', `${Math.random() * 100}%`);
      petal.style.setProperty('--petal-color', colors[index % colors.length]);
      layer.appendChild(petal);
    }

    document.body.appendChild(layer);
    focusParticleLayer = layer;

    focusParticleCleanupTimer = window.setTimeout(() => {
      if (focusParticleLayer === layer) {
        layer.remove();
        focusParticleLayer = null;
      }
      focusParticleCleanupTimer = null;
    }, 5200);
  }

  function setFocusMode(enabled, animate = false, showParticles = animate) {
    clearFocusTransitionEffects();

    body.classList.toggle('focus-mode', enabled);

    if (focusModeButton) {
      focusModeButton.setAttribute('aria-pressed', String(enabled));
      focusModeButton.textContent = enabled ? 'Exit Zen Mode' : 'Zen Mode';
    }

    if (enabled && sidebar && overlay) {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      if (toggleButton) {
        toggleButton.textContent = '🎶 Music';
      }
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
    }

    if (enabled && animate) {
      body.classList.add('focus-mode-transition');
      focusTransitionTimer = window.setTimeout(() => {
        body.classList.remove('focus-mode-transition');
        focusTransitionTimer = null;
      }, 2600);
    }

    if (enabled && showParticles) {
      spawnFocusPetals();
    }

    try {
      window.sessionStorage.setItem(storageKey, enabled ? '1' : '0');
    } catch (error) {
      // Ignore storage failures and keep the mode purely in-memory.
    }
  }

  let savedFocusMode = false;

  try {
    savedFocusMode = window.sessionStorage.getItem(storageKey) === '1';
  } catch (error) {
    savedFocusMode = false;
  }

  setFocusMode(savedFocusMode, false);

  if (toggleButton && sidebar && overlay && music) {
    toggleButton.addEventListener('click', function() {
      const isVisible = sidebar.classList.toggle('show');
      overlay.classList.toggle('show', isVisible);
      toggleButton.textContent = isVisible ? '✖ Live Feed' : '🎶 Live Feed';

      if (isVisible) {
        music.currentTime = 0;
        music.play();
        music.volume = 0.3;
      } else {
        music.pause();
        music.currentTime = 0;
      }
    });
    
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      toggleButton.textContent = '🎶 Live Feed';
    });
  }

  if (focusModeButton) {
    focusModeButton.addEventListener('click', function() {
      const nextState = !body.classList.contains('focus-mode');
      setFocusMode(nextState, nextState && !mobileFocusModeQuery.matches, true);
      if (nextState) {
        playAngelHarpTone();
      }
    });
  }
});
