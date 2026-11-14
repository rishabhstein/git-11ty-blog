document.addEventListener("DOMContentLoaded", () => {
  const items = Array.from(document.querySelectorAll(".workout-month-panel .workout-log-item"));
  if (!items.length) return;

  items.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;

      items.forEach((other) => {
        if (other !== item) {
          other.open = false;
        }
      });
    });
  });
});
