(() => {
  const mobileQuery = window.matchMedia("(max-width: 1100px)");
  let wasMobile = mobileQuery.matches;

  function getSectionContent(heading) {
    const nodes = [];
    let next = heading.nextElementSibling;
    while (next && next.tagName !== "H3") {
      nodes.push(next);
      next = next.nextElementSibling;
    }
    return nodes;
  }

  function updateSidebarSections() {
    const isMobile = mobileQuery.matches;

    document.querySelectorAll(".portal-left h3, .portal-right h3").forEach((heading) => {
      const contentNodes = getSectionContent(heading);
      if (!contentNodes.length) return;

      heading.classList.add("sidebar-collapsible");

      if (!heading.dataset.sidebarBound) {
        heading.addEventListener("click", (event) => {
          if (!mobileQuery.matches) return;
          if (event.target.closest("a")) return;

          const isCollapsed = heading.dataset.collapsed !== "false";
          const nextCollapsed = !isCollapsed;
          heading.dataset.collapsed = String(nextCollapsed);
          contentNodes.forEach((node) => {
            node.hidden = nextCollapsed;
          });
        });
        heading.dataset.sidebarBound = "true";
      }

      if (isMobile) {
        if (!wasMobile) {
          heading.dataset.collapsed = "true";
        }
        const collapsed = heading.dataset.collapsed !== "false";
        heading.dataset.collapsed = String(collapsed);
        contentNodes.forEach((node) => {
          node.hidden = collapsed;
        });
      } else {
        heading.dataset.collapsed = "false";
        contentNodes.forEach((node) => {
          node.hidden = false;
        });
      }
    });

    wasMobile = isMobile;
  }

  window.addEventListener("resize", updateSidebarSections);
  window.addEventListener("DOMContentLoaded", updateSidebarSections);
  updateSidebarSections();
})();
