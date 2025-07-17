document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.querySelector('.toggle-sidebar');
  const sidebar = document.querySelector('.right-column');
  const overlay = document.querySelector('.overlay');
  const music = document.getElementById('sidebar-music'); 

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
      toggleButton.textContent = '☰ Show Sidebar';
    });
  }
});
