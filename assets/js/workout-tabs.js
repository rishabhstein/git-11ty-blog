(() => {
  function activateTab(root, tabButton) {
    const tabs = Array.from(root.querySelectorAll("[data-workout-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-workout-tab-panel]"));
    const targetId = tabButton.dataset.workoutTabTarget;

    tabs.forEach((button) => {
      const isActive = button === tabButton;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.workoutTabTarget === targetId;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });
  }

  function initWorkoutTabs(root) {
    const tabs = Array.from(root.querySelectorAll("[data-workout-tab]"));
    if (!tabs.length) return;

    const firstActive = tabs.find((button) => button.classList.contains("is-active")) || tabs[0];
    activateTab(root, firstActive);

    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-workout-tab]");
      if (!button || !root.contains(button)) return;
      activateTab(root, button);
    });

    root.addEventListener("keydown", (event) => {
      const button = event.target.closest("[data-workout-tab]");
      if (!button || !root.contains(button)) return;

      const index = tabs.indexOf(button);
      if (index === -1) return;

      let nextIndex = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex === null) return;

      event.preventDefault();
      tabs[nextIndex].focus();
      activateTab(root, tabs[nextIndex]);
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-workout-tabs]").forEach(initWorkoutTabs);
  });
})();
