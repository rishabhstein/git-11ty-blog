// Fills the header marquee with the latest Status Cafe post.
//
// This talks to status.cafe's JSON endpoint directly rather than loading their
// current-status.js embed. That embed builds its container with
// document.writeln(), which only works while the parser is still open — from a
// deferred or async script it either wipes the document or is dropped, so the
// markup it was supposed to create never appeared and the ticker sat on its
// loading text forever.
document.addEventListener('DOMContentLoaded', function () {
  const ticker = document.getElementById('geo-status-marquee-text');
  if (!ticker) return;

  const user = ticker.dataset.statuscafeUser;
  const fallback = 'Visit status.cafe for the latest update';

  if (!user) {
    ticker.textContent = fallback;
    return;
  }

  fetch(`https://status.cafe/users/${encodeURIComponent(user)}/status.json`)
    .then(function (response) {
      if (!response.ok) throw new Error(`status.cafe responded ${response.status}`);
      return response.json();
    })
    .then(function (status) {
      const content = String(status.content || '').replace(/\s+/g, ' ').trim();
      if (!content) throw new Error('no status set');

      const timeAgo = String(status.timeAgo || '').trim();
      ticker.textContent = timeAgo ? `${content} — ${timeAgo}` : content;
    })
    .catch(function () {
      ticker.textContent = fallback;
    });
});
