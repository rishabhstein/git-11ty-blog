document.addEventListener('DOMContentLoaded', function () {
  const ticker = document.getElementById('geo-status-marquee-text');
  if (!ticker) return;

  const fallback = 'STATUS: Visit status.cafe for the latest update';

  const updateTickerFromStatus = () => {
    const content = document.getElementById('statuscafe-content');
    if (!content) return false;

    const text = (content.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;

    ticker.textContent = text;
    return true;
  };

  if (updateTickerFromStatus()) return;

  let tries = 0;
  const maxTries = 30;
  const timer = setInterval(function () {
    tries += 1;
    if (updateTickerFromStatus() || tries >= maxTries) {
      clearInterval(timer);
      if (tries >= maxTries && ticker.textContent.trim() === '') {
        ticker.textContent = fallback;
      }
    }
  }, 500);
});
