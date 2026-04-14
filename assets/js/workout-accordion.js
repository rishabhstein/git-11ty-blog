(() => {
  function initWorkoutAccordion(root) {
    const items = Array.from(root.querySelectorAll("details.workout-log-item"));
    if (!items.length) return;

    items.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;

        items.forEach((otherItem) => {
          if (otherItem !== item) {
            otherItem.open = false;
          }
        });
      });
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".workout-log-page").forEach(initWorkoutAccordion);
  });
})();
