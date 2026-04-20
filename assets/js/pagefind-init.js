document.addEventListener("DOMContentLoaded", function() {
  if (!window.PagefindUI) return;

  document.querySelectorAll("[data-pagefind-ui]").forEach(function(element) {
    if (!element.id || element.dataset.pagefindInitialized === "true") return;

    element.dataset.pagefindInitialized = "true";
    new PagefindUI({
      element: `#${element.id}`,
      showImages: false,
    });
  });
});
