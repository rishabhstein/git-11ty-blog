(() => {
  const minRevealDelayMs = 100;
  const revealableSelector = "img:not(.no-image-reveal):not([data-no-image-reveal])";
  const trackedImages = new WeakSet();

  const reveal = (image) => {
    if (!image || trackedImages.has(image)) return;
    trackedImages.add(image);

    const showImage = () => {
      window.setTimeout(() => {
        image.classList.add("is-visible");
      }, minRevealDelayMs);
    };

    if (image.complete && image.naturalWidth > 0) {
      showImage();
      return;
    }

    image.addEventListener("load", showImage, { once: true });
    image.addEventListener("error", () => {
      image.classList.add("is-visible");
    }, { once: true });
  };

  const scan = (root = document) => {
    root.querySelectorAll(revealableSelector).forEach(reveal);
    if (root.matches && root.matches(revealableSelector)) {
      reveal(root);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan(), { once: true });
  } else {
    scan();
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        scan(node);
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
