document.addEventListener("DOMContentLoaded", function() {
  if (!window.PagefindUI) return;

  const pathPrefix = window.__SITE_PATH_PREFIX__ || "/";
  const normalizedPrefix = pathPrefix.endsWith("/") ? pathPrefix : `${pathPrefix}/`;
  const basePath = `${normalizedPrefix}pagefind/`;

  document.querySelectorAll("[data-pagefind-ui]").forEach(function(element) {
    if (!element.id || element.dataset.pagefindInitialized === "true") return;

    element.dataset.pagefindInitialized = "true";
    new PagefindUI({
      element: `#${element.id}`,
      basePath,
      showImages: false,
    });
  });
});
