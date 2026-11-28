// Instagram-style viewer for the home page "Status Update" piclog.
// Clicking the cover plays this month's pictures (the current piclog plus any
// archived ones from this month), 10 seconds each, then closes. Older months
// are one reel each: scroll down, swipe up or press ↓ to slide to the
// previous month, the reverse to come back. Tap/click the right side or press → to skip, the
// left side or ← to go back, hold to pause, Esc or × to close.
(function () {
  var DURATION = 10000;
  var SWIPE = 50;

  var trigger = document.querySelector(".js-piclog-stories");
  var dataEl = document.getElementById("piclog-archive");
  if (!trigger || !dataEl) return;

  var archive = [];
  try {
    archive = JSON.parse(dataEl.textContent) || [];
  } catch (e) { /* archive is optional */ }

  // Reel 0 is the current month and always starts with the live piclog; every
  // older month in the archive gets its own reel, newest month first.
  var now = new Date();
  var thisMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  var reels = [{ month: thisMonth, stories: [{ src: trigger.getAttribute("href"), date: "" }] }];
  archive.forEach(function (story) {
    var month = story.date.slice(0, 7);
    var reel = reels[reels.length - 1];
    if (month === reel.month || (reels.length === 1 && month > thisMonth)) {
      reel.stories.push(story);
    } else {
      reels.push({ month: month, stories: [story] });
    }
  });

  var viewer, frameEl, bars, img, monthEl, dateEl, olderHint, olderLabel, newerHint;
  var reelIndex = 0;
  var stories = reels[0].stories;
  var index = 0;
  var elapsed = 0;
  var startedAt = 0;
  var paused = false;
  var frame = null;
  var lastFocus = null;
  var wheelLock = 0;
  var sliding = false;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var touch = window.matchMedia("(pointer: coarse)");

  function formatDate(iso) {
    if (!iso) return "Latest";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }

  function formatMonth(month) {
    var d = new Date(month + "-01T00:00:00");
    if (isNaN(d)) return month;
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function build() {
    viewer = el("div", "story-viewer");
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Status updates");
    viewer.hidden = true;

    frameEl = el("div", "story-frame");
    bars = el("div", "story-progress");

    var header = el("div", "story-header");
    var meta = el("span", "story-meta");
    monthEl = el("span", "story-month");
    dateEl = el("span", "story-date");
    meta.appendChild(monthEl);
    meta.appendChild(dateEl);
    var close = el("button", "story-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", closeViewer);
    header.appendChild(meta);
    header.appendChild(close);

    img = el("img", "story-image");
    img.alt = "Status update";

    newerHint = el("span", "story-hint story-hint-newer");
    // Older months get a big see-through arrow above the label, pointing the
    // way the gesture goes: up for a swipe, down for a scroll.
    olderHint = el("div", "story-more");
    olderHint.innerHTML =
      '<svg class="story-more-arrow" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2.5" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    olderLabel = el("span", "story-hint");
    olderHint.appendChild(olderLabel);

    frameEl.appendChild(img);
    frameEl.appendChild(bars);
    frameEl.appendChild(header);
    frameEl.appendChild(newerHint);
    frameEl.appendChild(olderHint);
    viewer.appendChild(frameEl);
    document.body.appendChild(viewer);

    // Hold anywhere on the picture to pause, a short tap navigates and a
    // vertical drag pulls the picture along with the finger, flipping to the
    // next month once it passes SWIPE.
    var downAt = 0;
    var downX = 0;
    var downY = 0;
    var dragging = false;
    var dragOffset = 0;
    frameEl.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".story-close") || sliding) return;
      downAt = Date.now();
      downX = e.clientX;
      downY = e.clientY;
      dragging = false;
      frameEl.setPointerCapture(e.pointerId);
      pause();
    });
    frameEl.addEventListener("pointermove", function (e) {
      if (!downAt) return;
      var dx = e.clientX - downX;
      var dy = e.clientY - downY;
      if (!dragging && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) dragging = true;
      if (!dragging) return;
      // Nothing that way: resist instead of following one-to-one.
      var target = reelIndex + (dy < 0 ? 1 : -1);
      dragOffset = target >= 0 && target < reels.length ? dy : dy / 4;
      frameEl.style.transform = "translateY(" + dragOffset / zoomOf(frameEl) + "px)";
    });
    frameEl.addEventListener("pointerup", function (e) {
      if (e.target.closest(".story-close") || !downAt) return;
      var held = Date.now() - downAt > 250;
      downAt = 0;
      if (dragging) {
        dragging = false;
        var dir = dragOffset < 0 ? 1 : -1;
        var target = reelIndex + dir;
        if (Math.abs(dragOffset) > SWIPE && target >= 0 && target < reels.length) {
          return slideToReel(target);
        }
        snapBack();
        return resume();
      }
      if (held) return resume();
      var rect = frameEl.getBoundingClientRect();
      if (e.clientX - rect.left < rect.width / 3) prev(); else next();
    });
    frameEl.addEventListener("pointercancel", function () {
      downAt = 0;
      if (dragging) { dragging = false; snapBack(); }
      resume();
    });
    // Android opens a context menu on long press, which would eat the hold.
    frameEl.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    // One wheel gesture fires many events; take the first and ignore the
    // rest of the burst.
    viewer.addEventListener("wheel", function (e) {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 10 || Date.now() < wheelLock) return;
      wheelLock = Date.now() + 700;
      slideToReel(reelIndex + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });

    // Clicking the dark backdrop outside the picture closes it.
    viewer.addEventListener("click", function (e) {
      if (e.target === viewer) closeViewer();
    });
  }

  function setBars() {
    Array.prototype.forEach.call(bars.children, function (bar, i) {
      var fill = bar.firstChild;
      fill.style.transform = "scaleX(" + (i < index ? 1 : i > index ? 0 : elapsed / DURATION) + ")";
    });
  }

  function tick() {
    if (!paused) {
      var t = performance.now();
      elapsed += t - startedAt;
      startedAt = t;
      if (elapsed >= DURATION) return next();
      setBars();
    }
    frame = requestAnimationFrame(tick);
  }

  function showReel(r) {
    if (r < 0 || r >= reels.length) return;
    reelIndex = r;
    stories = reels[r].stories;
    bars.textContent = "";
    stories.forEach(function () {
      var bar = el("span");
      bar.appendChild(el("i"));
      bars.appendChild(bar);
    });
    monthEl.textContent = formatMonth(reels[r].month);
    newerHint.textContent = r > 0
      ? (touch.matches ? "Swipe down" : "Scroll up") + " · " + formatMonth(reels[r - 1].month)
      : "";
    olderHint.hidden = !reels[r + 1];
    olderHint.classList.toggle("is-swipe", touch.matches);
    olderLabel.textContent = reels[r + 1]
      ? (touch.matches ? "Swipe up" : "Scroll down") + " · " + formatMonth(reels[r + 1].month)
      : "";
    show(0);
  }

  // The body is zoomed (--ui-scale), so finger distances in screen pixels
  // have to be scaled back to CSS pixels to keep the picture under the finger.
  function zoomOf(node) {
    return node.offsetHeight ? node.getBoundingClientRect().height / node.offsetHeight : 1;
  }

  function animated() {
    return !reduceMotion.matches && typeof frameEl.animate === "function";
  }

  // A drag that didn't go far enough settles back into place.
  function snapBack() {
    var from = frameEl.style.transform;
    if (!from) return;
    frameEl.style.transform = "";
    if (animated()) {
      frameEl.animate([{ transform: from }, { transform: "translateY(0)" }],
        { duration: 200, easing: "ease-out" });
    }
  }

  // Changing month slides the current picture off the top (or bottom) and
  // the new month in from the other side, like scrolling a feed.
  function slideToReel(r) {
    if (sliding) return;
    if (r < 0 || r >= reels.length) return snapBack();
    if (!animated()) {
      frameEl.style.transform = "";
      return showReel(r);
    }
    var dir = r > reelIndex ? 1 : -1;
    var from = frameEl.style.transform || "translateY(0)";
    sliding = true;
    pause();
    var out = frameEl.animate([
      { transform: from, opacity: 1 },
      { transform: "translateY(" + -dir * 100 + "%)", opacity: 0 }
    ], { duration: 220, easing: "ease-in", fill: "forwards" });
    out.onfinish = function () {
      frameEl.style.transform = "";
      if (viewer.hidden) {
        out.cancel();
        sliding = false;
        return;
      }
      showReel(r);
      pause();
      var into = frameEl.animate([
        { transform: "translateY(" + dir * 100 + "%)", opacity: 0 },
        { transform: "translateY(0)", opacity: 1 }
      ], { duration: 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
      out.cancel();
      into.onfinish = function () {
        sliding = false;
        resume();
      };
    };
  }

  function show(i) {
    index = i;
    elapsed = 0;
    paused = false;
    startedAt = performance.now();
    img.src = stories[i].src;
    dateEl.textContent = formatDate(stories[i].date);
    // Warm the next picture so the switch doesn't flash.
    if (stories[i + 1]) new Image().src = stories[i + 1].src;
    setBars();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  }

  // The reel stops at the end of its month; older months are opt-in.
  function next() {
    if (index + 1 < stories.length) show(index + 1); else closeViewer();
  }

  function prev() {
    show(Math.max(0, index - 1));
  }

  function pause() {
    paused = true;
  }

  function resume() {
    if (!paused) return;
    paused = false;
    startedAt = performance.now();
  }

  function onKey(e) {
    if (e.key === "Escape") closeViewer();
    else if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") prev();
    else if (e.key === "ArrowDown") { e.preventDefault(); slideToReel(reelIndex + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); slideToReel(reelIndex - 1); }
    else if (e.key === " ") {
      e.preventDefault();
      if (paused) resume(); else pause();
    }
  }

  function openViewer() {
    if (!viewer) build();
    lastFocus = document.activeElement;
    viewer.hidden = false;
    frameEl.style.transform = "";
    sliding = false;
    document.documentElement.classList.add("story-open");
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    showReel(0);
    viewer.querySelector(".story-close").focus();
  }

  function closeViewer() {
    cancelAnimationFrame(frame);
    viewer.hidden = true;
    document.documentElement.classList.remove("story-open");
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVisibility);
    if (lastFocus) lastFocus.focus();
  }

  function onVisibility() {
    if (document.hidden) pause(); else resume();
  }

  trigger.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openViewer();
  });
})();
