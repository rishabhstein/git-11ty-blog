// Turns <time class="js-time-ago" datetime="..."> into "3h ago". The page is
// only rebuilt twice a day, so a relative time baked in at build would go
// stale; the build writes a plain date, which stays if this doesn't run.
document.addEventListener('DOMContentLoaded', function () {
  const units = [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]];

  document.querySelectorAll('time.js-time-ago').forEach(function (el) {
    const then = Date.parse(el.getAttribute('datetime'));
    if (Number.isNaN(then)) return;

    const seconds = Math.max(0, (Date.now() - then) / 1000);
    const unit = units.find(function (u) { return seconds >= u[1]; });
    el.title = new Date(then).toLocaleString();
    el.textContent = unit ? Math.floor(seconds / unit[1]) + unit[0] + ' ago' : 'just now';
  });
});
