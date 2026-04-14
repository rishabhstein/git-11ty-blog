document.addEventListener('DOMContentLoaded', function () {
  const images = document.querySelectorAll('img');

  const shouldSkip = (img) => {
    if (img.classList.contains('icon-emoji')) return true;
    if (img.closest('footer')) return true;
    if (img.closest('.telegraph-topline') || img.closest('.telegraph-primary-nav') || img.closest('.telegraph-secondary-nav')) return true;
    if (img.closest('.mt-post-avatar')) return true;
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    if ((width && Number(width) <= 64) || (height && Number(height) <= 64)) return true;
    return false;
  };

  const applyEffect = (img) => {
    if (img.dataset.geoFxApplied === '1') return;
    img.dataset.geoFxApplied = '1';
    img.classList.remove('geo-image-pending');
    img.classList.add('geo-image-loading');

    const reveal = () => {
      img.classList.add('geo-image-loaded');
      img.classList.remove('geo-image-loading');
    };

    if (img.complete && img.naturalWidth > 0) {
      requestAnimationFrame(function () {
        setTimeout(reveal, 60);
      });
      return;
    }

    img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', () => {
      img.classList.remove('geo-image-loading');
    }, { once: true });
  };

  const registerImage = (img) => {
    if (shouldSkip(img)) return;
    if (img.dataset.geoFxRegistered === '1') return;
    img.dataset.geoFxRegistered = '1';
    img.classList.add('geo-image-pending');
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
    if (!('IntersectionObserver' in window)) {
      applyEffect(img);
      return;
    }
    observer.observe(img);
  };

  const candidates = Array.from(images);

  const observer = ('IntersectionObserver' in window) ? new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        applyEffect(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px',
    }
  ) : null;

  candidates.forEach(registerImage);

  const mo = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.tagName === 'IMG') {
          registerImage(node);
        }
        node.querySelectorAll?.('img').forEach(registerImage);
      });
    });
  });

  mo.observe(document.body, { childList: true, subtree: true });
});
