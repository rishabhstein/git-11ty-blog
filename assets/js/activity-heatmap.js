(() => {
  const MAX_ACTIVITY_LEVEL = 4;

  function buildDailyCounts(rawDates) {
    const counts = new Map();

    rawDates
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((date) => {
        counts.set(date, (counts.get(date) || 0) + 1);
      });

    return counts;
  }

  function buildDailyLinks(rawDates, rawUrls) {
    const links = new Map();
    const dates = rawDates
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const urls = rawUrls
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    dates.forEach((date, index) => {
      if (!links.has(date) && urls[index]) {
        links.set(date, urls[index]);
      }
    });

    return links;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function parseMonthValue(rawValue) {
    if (!rawValue) return null;
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return startOfMonth(parsed);
  }

  function parseMonthKey(rawValue) {
    if (!rawValue) return null;
    const match = String(rawValue).match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const [, year, month] = match;
    return new Date(Number(year), Number(month) - 1, 1);
  }

  function sameMonth(left, right) {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  function formatMonth(date) {
    return date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  function formatMonthLabel(date, mode, suffix) {
    const baseLabel = mode === "month-only"
      ? date.toLocaleDateString(undefined, { month: "long" })
      : formatMonth(date);

    return suffix ? `${baseLabel}${suffix}` : baseLabel;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function isoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function createEmptyCell() {
    const cell = document.createElement("span");
    cell.className = "activity-cell activity-empty";
    return cell;
  }

  function createDayCell(date, count, singularLabel, pluralLabel, displayText = true, linkHref = "") {
    const cell = linkHref ? document.createElement("a") : document.createElement("span");
    const activityLevel = Math.min(count, MAX_ACTIVITY_LEVEL);
    const label = isoDate(date);
    const activityLabel = count === 1 ? singularLabel : pluralLabel;

    cell.className = `activity-cell activity-level-${activityLevel}`;
    cell.textContent = displayText ? date.getDate() : "";
    cell.title = count
      ? `${label}: ${count} ${activityLabel}`
      : `${label}: no ${pluralLabel}`;
    if (linkHref) {
      cell.setAttribute("href", linkHref);
    }

    return cell;
  }

  function renderMonth(grid, monthDate, dailyCounts, dailyLinks, singularLabel, pluralLabel, displayStyle, monthLinkPrefix) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const numberOfDays = new Date(year, month + 1, 0).getDate();

    grid.innerHTML = "";

    if (displayStyle !== "strip") {
      const firstDayOfMonth = new Date(year, month, 1);
      const leadingEmptyCells = firstDayOfMonth.getDay();

      // Pad the first week so the month starts under the correct weekday.
      for (let i = 0; i < leadingEmptyCells; i += 1) {
        grid.appendChild(createEmptyCell());
      }
    }

    for (let day = 1; day <= numberOfDays; day += 1) {
      const dayDate = new Date(year, month, day);
      const dateKey = isoDate(dayDate);
      const count = dailyCounts.get(dateKey) || 0;
      const linkHref = monthLinkPrefix ? `${monthLinkPrefix}${monthKey(dayDate)}` : (dailyLinks.get(dateKey) || "");
      grid.appendChild(
        createDayCell(dayDate, count, singularLabel, pluralLabel, true, linkHref)
      );
    }
  }

  function renderHeatmap(root) {
    const dailyCounts = buildDailyCounts(root.dataset.activityDates || "");
    const dailyLinks = buildDailyLinks(root.dataset.activityDates || "", root.dataset.activityItemUrls || "");
    const grid = root.querySelector(".activity-grid");
    const monthLabel = root.querySelector(".activity-month-label");
    const previousButton = root.querySelector(".activity-prev");
    const nextButton = root.querySelector(".activity-next");
    const singularLabel = root.dataset.activityLabelSingular || "post";
    const pluralLabel = root.dataset.activityLabelPlural || "posts";
    const displayStyle = root.dataset.activityStyle || "calendar";
    const monthLabelMode = root.dataset.activityMonthLabelMode || "month-year";
    const monthLabelSuffix = root.dataset.activityMonthLabelSuffix || "";
    const monthLinkPrefix = root.dataset.activityMonthLinkPrefix || "";
    const syncTargetSelector = root.dataset.activitySyncTarget;
    const minimumMonth = parseMonthValue(root.dataset.activityMinMonth);
    const maximumMonth = parseMonthValue(root.dataset.activityMaxMonth);
    let visibleMonth = parseMonthValue(root.dataset.activityInitialMonth) || startOfMonth(new Date());

    if (minimumMonth && visibleMonth < minimumMonth) visibleMonth = minimumMonth;
    if (maximumMonth && visibleMonth > maximumMonth) visibleMonth = maximumMonth;

    function syncVisibleMonth() {
      if (!syncTargetSelector) return;

      const syncRoot = document.querySelector(syncTargetSelector);
      if (!syncRoot) return;

      const targetMonthKey = monthKey(visibleMonth);
      syncRoot.querySelectorAll("[data-workout-month]").forEach((panel) => {
        panel.hidden = panel.dataset.workoutMonth !== targetMonthKey;
      });

      const overviewTitle = document.querySelector("[data-workout-month-overview-title]");
      if (overviewTitle) {
        overviewTitle.textContent = formatMonth(visibleMonth);
      }
    }

    function syncFromHash() {
      if (!syncTargetSelector) return;

      const hashMatch = window.location.hash.match(/^#month-(\d{4}-\d{2})$/);
      if (!hashMatch) return;

      const nextMonth = parseMonthKey(hashMatch[1]);
      if (!nextMonth) return;

      visibleMonth = nextMonth;
      if (minimumMonth && visibleMonth < minimumMonth) visibleMonth = minimumMonth;
      if (maximumMonth && visibleMonth > maximumMonth) visibleMonth = maximumMonth;
      update();
    }

    function update() {
      monthLabel.textContent = formatMonthLabel(visibleMonth, monthLabelMode, monthLabelSuffix);
      if (monthLinkPrefix) {
        monthLabel.setAttribute("href", `${monthLinkPrefix}${monthKey(visibleMonth)}`);
      } else {
        monthLabel.removeAttribute("href");
      }
      renderMonth(grid, visibleMonth, dailyCounts, dailyLinks, singularLabel, pluralLabel, displayStyle, monthLinkPrefix);
      previousButton.disabled = Boolean(minimumMonth && sameMonth(visibleMonth, minimumMonth));
      nextButton.disabled = Boolean(maximumMonth && sameMonth(visibleMonth, maximumMonth));
      syncVisibleMonth();
    }

    previousButton.addEventListener("click", () => {
      if (minimumMonth && sameMonth(visibleMonth, minimumMonth)) return;
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
      if (minimumMonth && visibleMonth < minimumMonth) visibleMonth = minimumMonth;
      update();
    });

    nextButton.addEventListener("click", () => {
      if (maximumMonth && sameMonth(visibleMonth, maximumMonth)) return;
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
      if (maximumMonth && visibleMonth > maximumMonth) visibleMonth = maximumMonth;
      update();
    });

    root.addEventListener("activityheatmap:setmonth", (event) => {
      const nextMonth = parseMonthKey(event.detail?.monthKey);
      if (!nextMonth) return;

      visibleMonth = nextMonth;
      if (minimumMonth && visibleMonth < minimumMonth) visibleMonth = minimumMonth;
      if (maximumMonth && visibleMonth > maximumMonth) visibleMonth = maximumMonth;
      update();
    });

    window.addEventListener("hashchange", syncFromHash);

    update();
    syncFromHash();
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".activity-heatmap").forEach(renderHeatmap);
  });
})();
