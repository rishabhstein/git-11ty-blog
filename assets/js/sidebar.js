document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.querySelector('.toggle-sidebar');
  const sidebar = document.querySelector('.right-column');
  const mainContent = document.querySelector('.main-content');
  const overlay = document.querySelector('.overlay');
  const music = document.getElementById('sidebar-music'); 

  function syncSidebarHeight() {
    if (!sidebar || !mainContent) return;

    const isMobile = window.matchMedia('(max-width: 800px)').matches;
    if (isMobile) {
      sidebar.style.height = '';
      sidebar.style.maxHeight = '';
      return;
    }

    const mainHeight = Math.ceil(mainContent.getBoundingClientRect().height);
    if (mainHeight > 0) {
      sidebar.style.height = `${mainHeight}px`;
      sidebar.style.maxHeight = `${mainHeight}px`;
    }
  }

  if (toggleButton && sidebar && overlay && music) {
    syncSidebarHeight();

    if (typeof ResizeObserver !== 'undefined' && mainContent) {
      const resizeObserver = new ResizeObserver(() => {
        syncSidebarHeight();
      });
      resizeObserver.observe(mainContent);
      window.addEventListener('beforeunload', () => resizeObserver.disconnect(), { once: true });
    }

    window.addEventListener('resize', syncSidebarHeight);

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
      toggleButton.textContent = '☰ Show Sidebar';
    });
  }
});
