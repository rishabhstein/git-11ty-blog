const fs = require("fs");
const path = require("path");

module.exports = async function(eleventyConfig) {
  const sortNewestFirst = (items) => [...items].sort((a, b) => b.date - a.date);
  const uniqueYearsDescending = (items) =>
    [...new Set(items.map((item) => item.date.getFullYear()))].sort((a, b) => b - a);
  const takeItems = (items, count) => (Array.isArray(items) ? items.slice(0, count) : []);
  const secondsInDay = 24 * 60 * 60 * 1000;
  const siteUrl = "https://sigmarootpi.com";
  const webmentionEndpoint = process.env.WEBMENTION_ENDPOINT || "https://webmention.io/sigmarootpi.com/webmention";
  const webmentionDashboardUrl = "https://webmention.io/api/mentions.html?token=hshMNKohepVd3pJV5eMM_g";

  function parseWorkoutDurationSeconds(value) {
    if (!value) return 0;
    const parts = String(value).split(":").map((part) => Number(part));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return 0;
    const [hours, minutes, seconds] = parts;
    return (hours * 3600) + (minutes * 60) + seconds;
  }

  function parseWorkoutDistanceKm(value) {
    const distance = Number(value);
    return Number.isFinite(distance) ? distance : 0;
  }

  function formatTotalDistanceKm(value) {
    if (!Number.isFinite(value) || value <= 0) return "";
    if (value >= 100) return `${Math.round(value).toLocaleString()}`;
    return value.toFixed(2);
  }

  function formatTotalDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours && minutes) return `${hours.toLocaleString()} hours ${minutes} minutes`;
    if (hours) return `${hours.toLocaleString()} hours`;
    return `${minutes} minutes`;
  }

  function buildFeedCollection(collectionApi, tag, predicate = () => true) {
    return collectionApi
      .getFilteredByTag(tag)
      .filter(predicate)
      .slice()
      .sort((a, b) => a.date - b.date);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function firstMatch(text, patterns) {
    const source = String(text || "");
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) return match[1];
    }
    return "";
  }

  async function fetchText(url) {
    const response = await fetch(url, {
      headers: {
        "user-agent": "sigmarootpi-webmentions/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return response.text();
  }

  function normalizeWebmentions(html) {
    const mentionBlocks = String(html || "")
      .split('<div class="h-entry mention">')
      .slice(1)
      .map((block) => block.split('<div class="h-entry mention">')[0]);

    return mentionBlocks
      .map((block) => {
        const target = firstMatch(block, [
          /<a[^>]*class="[^"]*\bu-mention-of\b[^"]*"[^>]*href="([^"]+)"/i,
          /<a[^>]*href="([^"]+)"[^>]*class="[^"]*\bu-mention-of\b[^"]*"/i,
        ]).trim();
        const url = firstMatch(block, [
          /<time class="dt-published" datetime="[^"]+">[\s\S]*?<a href="([^"]+)" class="u-url">/i,
        ]);
        const published = firstMatch(block, [
          /<time class="dt-published" datetime="([^"]+)">/i,
        ]);
        const authorUrl = firstMatch(block, [
          /<a href="([^"]+)" class="name u-url p-name">/i,
        ]);
        const authorName = firstMatch(block, [
          /<a href="[^"]+" class="name u-url p-name">([\s\S]*?)<\/a>/i,
        ]).replace(/\s+/g, " ").trim();
        const hostFromUrl = getHostname(url);

        return {
          authorName: authorName || hostFromUrl || "Webmention",
          authorUrl: authorUrl || url,
          authorPhoto: "",
          url,
          target,
          published,
          typeLabel: target ? "Reply" : "Webmention",
        };
      })
      .sort((left, right) => {
        const leftTime = new Date(left.published || 0).getTime();
        const rightTime = new Date(right.published || 0).getTime();
        return rightTime - leftTime;
      });
  }

  function getHostname(url) {
    try {
      return url ? new URL(url).hostname.replace(/^www\./, "") : "";
    } catch {
      return "";
    }
  }

  function normalizePathname(value) {
    try {
      return new URL(value).pathname.replace(/\/$/, "") || "/";
    } catch {
      return String(value || "").replace(/\/$/, "") || "/";
    }
  }

  function extractWebmentionSourcePreview(html) {
    const text = String(html || "");
    const title = firstMatch(text, [
      /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
      /<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ]).replace(/\s+/g, " ").trim();

    return {
      title,
    };
  }

  async function fetchWebmentionPreview(sourceUrl) {
    if (!sourceUrl) {
      return {
        title: "",
      };
    }

    try {
      const html = await fetchText(sourceUrl);
      return extractWebmentionSourcePreview(html);
    } catch {
      return {
        title: "",
      };
    }
  }

  function formatWebmentionDate(value) {
    if (!value) return "";
    const dateTime = DateTime.fromISO(value);
    if (!dateTime.isValid) return "";
    return dateTime.toLocaleString(DateTime.DATE_MED);
  }

  function buildWebmentionItemHtml(mention) {
    const avatar = mention.authorPhoto
      ? `<img class="webmention-avatar" src="${escapeHtml(mention.authorPhoto)}" alt="" loading="lazy">`
      : `<span class="webmention-avatar webmention-avatar-fallback" aria-hidden="true">↳</span>`;
    const sourceLink = mention.url
      ? `<a href="${escapeHtml(mention.url)}" target="_blank" rel="noopener noreferrer">View source</a>`
      : "";
    const publishedLabel = formatWebmentionDate(mention.published);
    const published = publishedLabel
      ? `<p class="webmention-meta"><time datetime="${escapeHtml(mention.published)}">${escapeHtml(publishedLabel)}</time></p>`
      : "";
    const title = mention.title
      ? `<p class="webmention-title">${escapeHtml(mention.title)}</p>`
      : "";

    return `
        <li class="webmention-item">
          ${avatar}
          <div class="webmention-body">
            ${published}
            ${title}
            ${sourceLink ? `<p class="webmention-source">${sourceLink}</p>` : ""}
          </div>
        </li>
      `.trim();
  }

  function buildWebmentionsSectionHtml(mentions) {
    if (!mentions.length) return "";

    const itemsHtml = mentions.map(buildWebmentionItemHtml).join("\n");

    return `
      <section class="webmentions" aria-labelledby="webmentions-title">
        <h3 id="webmentions-title">Mentioned in</h3>
        <ul class="webmentions-list">
          ${itemsHtml}
        </ul>
      </section>
    `.trim();
  }

  function humanizeWorkoutPlotName(fileName, fallback = "Workout plot") {
    const baseName = path.basename(String(fileName || ""), ".svg");
    const cleaned = baseName.replace(/^\d{4}-\d{2}-\d{2}-(?:[^-]+-)?/, "");
    if (!cleaned) return fallback;

    return cleaned
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function workoutPlotSortWeight(fileName) {
    const baseName = path.basename(String(fileName || ""), ".svg").toLowerCase();
    if (baseName.includes("heart-rate")) return 0;
    if (baseName.includes("power")) return 1;
    if (baseName.includes("cadence")) return 2;
    return 10;
  }

  function normalizeWorkoutSvgPaths(inputPath, explicitPaths = []) {
    const requestedPaths = Array.isArray(explicitPaths)
      ? explicitPaths
      : explicitPaths
        ? [explicitPaths]
        : [];
    if (!inputPath && !requestedPaths.length) return [];

    const workoutBaseName = inputPath ? path.basename(inputPath, path.extname(inputPath)) : "";
    const workoutDir = inputPath ? path.dirname(inputPath) : path.join(process.cwd(), "src", "workout");
    const assetWorkoutDir = workoutBaseName
      ? path.join(process.cwd(), "assets", "workout", workoutBaseName)
      : "";
    const filePaths = [];

    const addPath = (candidatePath) => {
      if (!candidatePath) return;

      const resolvedPath = path.isAbsolute(candidatePath)
        ? candidatePath
        : path.resolve(workoutDir, candidatePath);

      if (!fs.existsSync(resolvedPath)) return;

      if (fs.statSync(resolvedPath).isDirectory()) {
        addPathsFromDirectory(resolvedPath);
        return;
      }

      if (!resolvedPath.endsWith(".svg")) return;
      if (!filePaths.includes(resolvedPath)) filePaths.push(resolvedPath);
    };

    const addPathsFromDirectory = (directoryPath, fileFilter = () => true) => {
      if (!directoryPath || !fs.existsSync(directoryPath)) return;

      fs.readdirSync(directoryPath)
        .filter((fileName) => fileName.endsWith(".svg") && fileFilter(fileName))
        .sort()
        .forEach((fileName) => addPath(path.join(directoryPath, fileName)));
    };

    if (assetWorkoutDir) {
      const preferredNames = ["heart-rate.svg", "power.svg", "cadence.svg"];
      for (const fileName of preferredNames) {
        const candidatePath = path.join(assetWorkoutDir, fileName);
        if (fs.existsSync(candidatePath)) {
          addPath(candidatePath);
        }
      }
      if (filePaths.length) return filePaths.sort();
    }

    if (requestedPaths.length) {
      requestedPaths.forEach(addPath);
      return filePaths.sort();
    }

    if (!inputPath) return [];

    if (!fs.existsSync(workoutDir)) return [];

    addPathsFromDirectory(workoutDir, (fileName) => fileName.startsWith(path.basename(inputPath, path.extname(inputPath))));

    return filePaths;
  }

  function toWorkoutPublicUrl(resolvedPath) {
    const normalizedPath = path.resolve(resolvedPath);
    const relativePath = path.relative(process.cwd(), normalizedPath).replace(/\\/g, "/");

    if (relativePath.startsWith("src/workout/")) {
      return `/workout/${path.basename(normalizedPath)}`;
    }

    return `/${relativePath}`;
  }

  function readWorkoutMarkdownBody(inputPath) {
    if (!inputPath || !fs.existsSync(inputPath)) return "";

    const raw = fs.readFileSync(inputPath, "utf8");
    const match = raw.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
    return (match ? match[1] : raw).replace(/^\s+/, "");
  }

  function renderWorkoutPlotFigures(inputPath, explicitPaths = []) {
    const svgFiles = normalizeWorkoutSvgPaths(inputPath, explicitPaths);
    if (!svgFiles.length) return "";

    const workoutBaseName = inputPath ? path.basename(inputPath, path.extname(inputPath)) : "";
    const sortedSvgFiles = [...svgFiles].sort((left, right) => {
      const weightDelta = workoutPlotSortWeight(left) - workoutPlotSortWeight(right);
      if (weightDelta !== 0) return weightDelta;
      return path.basename(left).localeCompare(path.basename(right));
    });

    const plots = sortedSvgFiles.map((svgFile, index) => {
      const fileName = path.basename(svgFile);
      const title = humanizeWorkoutPlotName(fileName);
      const altLabel = `${title} plot`;
      const publicUrl = toWorkoutPublicUrl(svgFile);
      const tabId = `${workoutBaseName || "workout"}-${index}`;

      return `
      <div
        class="workout-plot-panel${index === 0 ? " is-active" : ""}"
        role="tabpanel"
        id="${escapeHtml(`${tabId}-panel`)}"
        aria-labelledby="${escapeHtml(`${tabId}-tab`)}"
        ${index === 0 ? "" : "hidden"}
        data-workout-tab-panel
        data-workout-tab-target="${escapeHtml(tabId)}"
      >
        <figure class="workout-plot-card">
          <figcaption class="workout-plot-caption">
            <strong class="workout-plot-title">${escapeHtml(title)}</strong>
            <a class="workout-plot-link" href="${escapeHtml(publicUrl)}">SVG</a>
          </figcaption>
          <img
            class="workout-plot-image"
            src="${escapeHtml(publicUrl)}"
            alt="${escapeHtml(altLabel)}${workoutBaseName ? ` for ${escapeHtml(workoutBaseName)}` : ""}"
            loading="lazy"
          >
        </figure>
      </div>`.trim();
    }).join("\n");

    const tabCount = sortedSvgFiles.length;
    const tabsMarkup = tabCount > 1
      ? `
<div class="workout-plot-tabs" role="tablist" aria-label="Workout plots">
${sortedSvgFiles.map((svgFile, index) => {
        const title = humanizeWorkoutPlotName(path.basename(svgFile));
        const tabId = `${workoutBaseName || "workout"}-${index}`;
        return `
  <button
    class="workout-plot-tab${index === 0 ? " is-active" : ""}"
    type="button"
    role="tab"
    id="${escapeHtml(`${tabId}-tab`)}"
    aria-selected="${index === 0 ? "true" : "false"}"
    aria-controls="${escapeHtml(`${tabId}-panel`)}"
    tabindex="${index === 0 ? "0" : "-1"}"
    data-workout-tab
    data-workout-tab-target="${escapeHtml(tabId)}"
  >${escapeHtml(title)}</button>`.trim();
      }).join("\n")}
</div>
<div class="workout-plot-panels">
${plots}
</div>`
      : plots;

    return `
<section class="workout-metric-plots workout-svg-plots">
  <h2 class="telegraph-section-title">Workout Plots</h2>
  <div class="workout-plot-grid"${tabCount > 1 ? ' data-workout-tabs' : ''}>
${tabsMarkup}
  </div>
</section>`.trim();
  }

  function normalizeWorkoutDay(dateValue) {
    const date = new Date(dateValue);
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  function summarizeWorkouts(items) {
    if (!Array.isArray(items) || !items.length) {
      return {
        totalActivities: 0,
        activeDays: 0,
        totalDays: 0,
        percentActiveDays: 0,
        totalDistanceKm: "",
        totalDurationLabel: "",
        currentStreak: 0,
        longestStreak: 0,
        longestBreak: 0,
      };
    }

    const sortedAscending = [...items].sort((a, b) => a.date - b.date);
    const uniqueDays = [...new Set(sortedAscending.map((item) => normalizeWorkoutDay(item.date).toISOString()))]
      .map((isoDate) => new Date(isoDate));

    const firstDay = uniqueDays[0];
    const today = normalizeWorkoutDay(new Date());
    const totalDays = Math.max(1, Math.floor((today - firstDay) / secondsInDay) + 1);
    const activeDays = uniqueDays.length;
    const percentActiveDays = Math.round((activeDays / totalDays) * 100);

    let currentStreak = 1;
    for (let index = uniqueDays.length - 1; index > 0; index -= 1) {
      const gap = Math.round((uniqueDays[index] - uniqueDays[index - 1]) / secondsInDay);
      if (gap === 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }

    let longestStreak = 1;
    let runningStreak = 1;
    let longestBreak = 0;

    for (let index = 1; index < uniqueDays.length; index += 1) {
      const gap = Math.round((uniqueDays[index] - uniqueDays[index - 1]) / secondsInDay);
      if (gap === 1) {
        runningStreak += 1;
      } else {
        runningStreak = 1;
        longestBreak = Math.max(longestBreak, gap - 1);
      }
      longestStreak = Math.max(longestStreak, runningStreak);
    }

    const totalDistance = items.reduce((sum, item) => sum + parseWorkoutDistanceKm(item.data.distance), 0);
    const totalDuration = items.reduce((sum, item) => sum + parseWorkoutDurationSeconds(item.data.duration), 0);

    return {
      totalActivities: items.length,
      activeDays,
      totalDays,
      percentActiveDays,
      totalDistanceKm: formatTotalDistanceKm(totalDistance),
      totalDurationLabel: formatTotalDuration(totalDuration),
      currentStreak,
      longestStreak,
      longestBreak,
    };
  }

  function summarizeWorkoutsByType(items) {
    if (!Array.isArray(items) || !items.length) return [];

    const groups = new Map();
    for (const item of items) {
      const workoutType = item.data.workout_type || "Workout";
      if (!groups.has(workoutType)) {
        groups.set(workoutType, {
          type: workoutType,
          activities: 0,
          distanceKm: 0,
          durationSeconds: 0,
        });
      }

      const entry = groups.get(workoutType);
      entry.activities += 1;
      entry.distanceKm += parseWorkoutDistanceKm(item.data.distance);
      entry.durationSeconds += parseWorkoutDurationSeconds(item.data.duration);
    }

    return [...groups.values()]
      .sort((left, right) => right.activities - left.activities)
      .map((entry) => ({
        type: entry.type,
        activities: entry.activities,
        distanceKm: formatTotalDistanceKm(entry.distanceKm),
        durationLabel: formatTotalDuration(entry.durationSeconds),
      }));
  }

  function groupWorkoutsByMonth(items) {
    if (!Array.isArray(items)) return [];

    const groups = [];
    for (const item of items) {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = DateTime.fromJSDate(date).toFormat("LLLL yyyy");
      const currentGroup = groups[groups.length - 1];
      if (!currentGroup || currentGroup.key !== key) {
        groups.push({ key, label, items: [item] });
      } else {
        currentGroup.items.push(item);
      }
    }
    return groups;
  }

  function buildWorkoutMonthSeries(items, count = 12) {
    const normalizedCount = Number(count) || 12;
    if (normalizedCount <= 0) return [];

    const counts = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const monthDate = DateTime.fromJSDate(new Date(item.date), { zone: "utc" }).startOf("month");
      const monthKey = monthDate.toISODate();
      if (!monthKey) continue;
      counts.set(monthKey, (counts.get(monthKey) || 0) + 1);
    }

    const current = DateTime.now().setZone("utc").startOf("month");
    const series = Array.from({ length: normalizedCount }, (_, index) => {
      const bucket = current.minus({ months: normalizedCount - 1 - index });
      const key = bucket.toISODate();
      return {
        key,
        count: counts.get(key) || 0,
        isCurrent: key === current.toISODate(),
        linkUrl: `/workout/${bucket.year}/#month-${bucket.toFormat("yyyy-MM")}`,
        label: bucket.toFormat("LLLL yyyy"),
        shortLabel: bucket.toFormat("LLL"),
      };
    });

    const maxCount = Math.max(...series.map((item) => item.count), 0);
    return series.map((item) => ({
      ...item,
      heightPercent: maxCount > 0 ? Math.max(10, Math.round((item.count / maxCount) * 100)) : 0,
      isEmpty: item.count === 0,
    }));
  }

  function buildWorkoutMonthSeriesForYear(items, year) {
    const targetYear = Number(year);
    if (!Number.isFinite(targetYear)) return [];

    const counts = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const date = new Date(item.date);
      if (date.getFullYear() !== targetYear) continue;
      const key = `${targetYear}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const series = Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;
      const key = `${targetYear}-${String(monthNumber).padStart(2, "0")}`;
      const monthDate = DateTime.fromObject({ year: targetYear, month: monthNumber, day: 1 }, { zone: "utc" });
      return {
        key,
        count: counts.get(key) || 0,
        label: monthDate.toFormat("LLLL yyyy"),
        shortLabel: monthDate.toFormat("LLL"),
        linkUrl: `#month-${key}`,
      };
    });

    const maxCount = Math.max(...series.map((item) => item.count), 0);
    return series.map((item) => ({
      ...item,
      heightPercent: maxCount > 0 ? Math.max(10, Math.round((item.count / maxCount) * 100)) : 0,
      isEmpty: item.count === 0,
    }));
  }

  // Dynamically import ESM modules
  const { EleventyRenderPlugin } = await import("@11ty/eleventy");
  const { feedPlugin } = await import("@11ty/eleventy-plugin-rss");
  const { DateTime } = await import("luxon");
  const markdownItModule = await import("markdown-it");
  const markdownIt = markdownItModule.default;
  const externalFeeds = require("./src/_lib/externalFeeds");
  const getPiclog = require("./src/_data/piclog");
  const getExternalFeeds = externalFeeds.getExternalFeeds || externalFeeds;
  const { readFeedPosts } = externalFeeds;

  //Just copy these files to _site
  eleventyConfig.addPassthroughCopy('./assets');
  eleventyConfig.addPassthroughCopy('./src/style.css');
  eleventyConfig.addPassthroughCopy('./src/robots.txt');
  eleventyConfig.addPassthroughCopy({"./src/workout/*.svg": "workout/"});

  // Register Piclog explicitly so homepage templates can depend on one clear global source.
  eleventyConfig.addGlobalData("piclog", async () => getPiclog());
  eleventyConfig.addGlobalData("site", {
    url: siteUrl,
    webmentionEndpoint,
    webmentionDashboardUrl,
  });

  // Creating a datetime format filter
  eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toLocaleString(DateTime.DATE_MED);
  });

  // Using RenderPlugin
  eleventyConfig.addPlugin(EleventyRenderPlugin);

  // Creating a Markdown filter
  const md = new markdownIt();
  eleventyConfig.addFilter("markdownify", (value) => {
    return md.render(value || "");
  });


  // Filtering only few words
  eleventyConfig.addFilter("wordLimit", function(content, limit = 50) {
    if (!content) return "";
    const words = content.split(/\s+/).slice(0, limit);
    return words.join(" ") + "...";
  });

  // Create plain-text excerpts so embedded images/HTML are not rendered.
  eleventyConfig.addFilter("plainExcerpt", function(content, limit = 40) {
    if (!content) return "";
    const withoutTags = content
      .replace(/<img[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = withoutTags.split(" ").slice(0, limit);
    return words.join(" ") + (withoutTags.split(" ").length > limit ? "..." : "");
  });

  eleventyConfig.addFilter("offset", function(items, count = 0) {
    if (!Array.isArray(items)) return [];
    return items.slice(count);
  });

  eleventyConfig.addFilter("shuffle", function(items) {
    if (!Array.isArray(items)) return [];
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });

  eleventyConfig.addFilter("groupByYear", function(items) {
    if (!Array.isArray(items)) return [];

    // Keep years grouped in the same order the items were passed in.
    const groups = [];
    for (const item of items) {
      const year = new Date(item.date).getFullYear();
      const currentGroup = groups[groups.length - 1];
      if (!currentGroup || currentGroup.year !== year) {
        groups.push({ year, items: [item] });
      } else {
        currentGroup.items.push(item);
      }
    }
    return groups;
  });

  eleventyConfig.addFilter("itemsForYear", function(items, year) {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => new Date(item.date).getFullYear() === Number(year));
  });

  eleventyConfig.addFilter("isoDate", function(dateObj) {
    return DateTime.fromJSDate(new Date(dateObj)).toISODate();
  });

  eleventyConfig.addFilter("monthKey", function(dateObj) {
    return DateTime.fromJSDate(new Date(dateObj)).toFormat("yyyy-MM");
  });

  eleventyConfig.addFilter("formatWorkoutDuration", function(value) {
    if (!value) return "";
    const parts = String(value).split(":");
    if (parts.length !== 3) return String(value);

    const [hours, minutes, seconds] = parts.map((part) => Number(part));
    const segments = [];
    if (hours) segments.push(`${hours}h`);
    if (minutes) segments.push(`${minutes}m`);
    if (seconds) segments.push(`${seconds}s`);
    return segments.join(" ") || String(value);
  });

  eleventyConfig.addFilter("take", function(items, count = 5) {
    return takeItems(items, Number(count) || 0);
  });

  eleventyConfig.addFilter("formatNumber", function(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString() : value;
  });

  eleventyConfig.addFilter("workoutBody", function(inputPath) {
    return readWorkoutMarkdownBody(inputPath);
  });

  eleventyConfig.addNunjucksAsyncShortcode("workoutPlots", async function(inputPath, explicitPaths = []) {
    return renderWorkoutPlotFigures(inputPath, explicitPaths);
  });

  eleventyConfig.addNunjucksAsyncShortcode("webmentionsFor", async function(targetUrl) {
    if (!targetUrl) return "";

    try {
      const html = await fetchText(webmentionDashboardUrl);
      const mentions = normalizeWebmentions(html).filter((mention) => {
        try {
          return mention.target
            ? normalizePathname(mention.target) === normalizePathname(targetUrl)
            : true;
        } catch {
          return true;
        }
      });

      const mentionsWithPreview = await Promise.all(mentions.map(async (mention) => ({
        ...mention,
        ...(await fetchWebmentionPreview(mention.url)),
      })));

      return buildWebmentionsSectionHtml(mentionsWithPreview);
    } catch {
      return "";
    }
  });

  // Workout pages use a few pre-shaped summary objects to keep the templates readable.
  eleventyConfig.addFilter("workoutSummary", function(items) {
    return summarizeWorkouts(items);
  });

  eleventyConfig.addFilter("workoutTypeSummary", function(items) {
    return summarizeWorkoutsByType(items);
  });

  eleventyConfig.addFilter("groupWorkoutsByMonth", function(items) {
    return groupWorkoutsByMonth(items);
  });

  eleventyConfig.addFilter("workoutMonthSeries", function(items, year) {
    return buildWorkoutMonthSeriesForYear(items, year);
  });

  eleventyConfig.addFilter("workoutMonthSeriesRolling", function(items, count = 12) {
    return buildWorkoutMonthSeries(items, count);
  });

  eleventyConfig.addNunjucksAsyncShortcode("externalFeedCards", async function() {
    const feeds = await getExternalFeeds();

    return feeds.map((feed) => `
<article class="external-feed-card">
  <div class="tagline"><strong>${feed.tag || ""}</strong></div>
  ${feed.imageUrl ? `
  <a href="${feed.postUrl}" target="_blank" rel="noopener noreferrer" class="external-feed-thumb-link">
    <img src="${feed.imageUrl}" alt="${feed.postTitle}" class="external-feed-thumb">
  </a>` : ""}
  <div class="external-feed-source">
    <a href="${feed.sourceUrl}" target="_blank" rel="noopener noreferrer">${feed.label}</a>
  </div>
  <a href="${feed.postUrl}" target="_blank" rel="noopener noreferrer"><strong>${feed.postTitle}</strong></a>
  <p>${feed.excerpt}</p>
</article>`.trim()).join("\n");
  });

  eleventyConfig.addNunjucksAsyncShortcode("postrollItems", async function() {
    const formatInterviewName = (title = "") =>
      String(title)
        .replace(/^people\s*(and|&)\s*blogs\s*[:\-]\s*/i, "")
        .replace(/^pb\s*[:\-]\s*/i, "")
        .trim() || title;

    try {
      const posts = await readFeedPosts({
        label: "People & Blogs",
        tag: "Interview",
        feedUrl: "https://manuelmoreale.com/feed/peopleandblogs",
        siteUrl: "https://manuelmoreale.com/",
        limit: 5,
      });

      return `
<h3><a href="https://manuelmoreale.com/people-and-blogs">People and Blogs</a></h3>
<ul class="portal-list">
  ${posts.map((post) => `
  <li>
    <a href="${post.postUrl}">${formatInterviewName(post.postTitle)}</a>
  </li>`).join("\n  ")}
</ul>`.trim();
    } catch {
      return `
<h3><a href="https://manuelmoreale.com/people-and-blogs">People and Blogs</a></h3>
<ul class="portal-list">
  <li>
    <a href="https://manuelmoreale.com/feed/peopleandblogs">Latest interview</a>
  </li>
</ul>`.trim();
    }
  });

  eleventyConfig.addNunjucksAsyncShortcode("bearblogDiscoveryItems", async function() {
    try {
      const posts = await readFeedPosts({
        label: "Bearblog Discovery",
        tag: "Discovery",
        feedUrl: "https://bearblog.dev/discover/feed/",
        siteUrl: "https://bearblog.dev/discover/",
        limit: 5,
      });

      return `
<h3><a href="https://bearblog.dev/discover/">Bearblog Discovery</a></h3>
<ul class="portal-list">
  ${posts.map((post) => `
  <li>
    <a href="${post.postUrl}">${post.postTitle}</a>
  </li>`).join("\n  ")}
</ul>`.trim();
    } catch {
      return `
<h3><a href="https://bearblog.dev/discover/">Bearblog Discovery</a></h3>
<ul class="portal-list">
  <li>
    <a href="https://bearblog.dev/discover/">Latest discovery posts</a>
  </li>
</ul>`.trim();
    }
  });

  // Collection for all unique tags, normalized to lowercase so tag
  // archives stay case-insensitive.
  eleventyConfig.addCollection("tagList", function(collection) {
    const tagsSet = new Set();
    collection.getAll().forEach(item => {
      (item.data.tags || []).forEach(tag => tagsSet.add(String(tag).toLowerCase()));
    });
    return [...tagsSet];
  });

  eleventyConfig.addFilter("postsByTagInsensitive", function(collection, tag) {
    const needle = String(tag).toLowerCase();
    return collection.filter(item => {
      const tags = item.data.tags || [];
      return tags.some(itemTag => String(itemTag).toLowerCase() === needle);
    });
  });

  // Group posts by year
  eleventyConfig.addCollection("postsByYear", function(collectionApi) {
    const posts = collectionApi.getFilteredByGlob("./posts/*.md");

    let postsByYear = {};

    posts.forEach(post => {
      const year = post.date.getFullYear();
      if (!postsByYear[year]) postsByYear[year] = [];
      postsByYear[year].push(post);
    });

    return postsByYear;
  });

  eleventyConfig.addCollection("postArchive", function(collectionApi) {
    return sortNewestFirst(collectionApi.getFilteredByTag("post"));
  });

  eleventyConfig.addCollection("writingFeed", function(collectionApi) {
    return buildFeedCollection(collectionApi, "post");
  });

  eleventyConfig.addCollection("bookArchive", function(collectionApi) {
    return sortNewestFirst(
      collectionApi
        .getFilteredByTag("books")
        .filter((item) => item.data.published)
    );
  });

  eleventyConfig.addCollection("bookFeed", function(collectionApi) {
    return buildFeedCollection(collectionApi, "books", (item) => item.data.published);
  });

  eleventyConfig.addCollection("movieArchive", function(collectionApi) {
    return sortNewestFirst(collectionApi.getFilteredByTag("movies"));
  });

  eleventyConfig.addCollection("movieFeed", function(collectionApi) {
    return buildFeedCollection(collectionApi, "movies");
  });

  eleventyConfig.addCollection("workoutArchive", function(collectionApi) {
    return sortNewestFirst(collectionApi.getFilteredByTag("workout"));
  });

  eleventyConfig.addCollection("snapFeed", function(collectionApi) {
    return buildFeedCollection(collectionApi, "snap");
  });

  eleventyConfig.addCollection("workoutFeed", function(collectionApi) {
    return buildFeedCollection(collectionApi, "workout");
  });

  eleventyConfig.addCollection("postArchiveYears", function(collectionApi) {
    return uniqueYearsDescending(collectionApi.getFilteredByTag("post"));
  });

  eleventyConfig.addCollection("bookArchiveYears", function(collectionApi) {
    return uniqueYearsDescending(
      collectionApi
        .getFilteredByTag("books")
        .filter((item) => item.data.published)
    );
  });

  eleventyConfig.addCollection("movieArchiveYears", function(collectionApi) {
    return uniqueYearsDescending(collectionApi.getFilteredByTag("movies"));
  });

  eleventyConfig.addCollection("workoutArchiveYears", function(collectionApi) {
    return uniqueYearsDescending(collectionApi.getFilteredByTag("workout"));
  });

  eleventyConfig.addCollection("siteActivity", function(collectionApi) {
    // The sidebar heatmap combines activity from all the main content types.
    return sortNewestFirst([
      ...collectionApi.getFilteredByTag("post"),
      ...collectionApi.getFilteredByTag("books").filter((item) => item.data.published),
      ...collectionApi.getFilteredByTag("movies"),
      ...collectionApi.getFilteredByTag("snap"),
    ]);
  });

  // // Adding RSS feed and Combined feed collection
  eleventyConfig.addCollection("combinedFeed", function (collectionApi) {
    return [
      ...collectionApi.getFilteredByTag("post"),
      ...collectionApi.getFilteredByTag("snap"),
      ...collectionApi.getFilteredByTag("books"),
      ...collectionApi.getFilteredByTag("movies"),
    ].sort((a, b) => a.date - b.date); // Sort descending by date
  });


  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss", // "atom" or "rss", "json"
    outputPath: "/feed.xml",
    collection: {
      name: "combinedFeed", // changed from "post" to "posts" to match collection name
      limit: 10,     // 0 means no limit
    },
    metadata: {
      language: "en",
      title: "Sigmarootpi",
      subtitle: "An outdated habbit of spitting my thoughts.",
      base: "https://sigmarootpi.com/",
      author: {
        name: "Rishabh",
        email: "sigmarootpi@proton.me", // Optional
      }
    }
  });

  const feedMetadata = {
    language: "en",
    subtitle: "An outdated habbit of spitting my thoughts.",
    base: "https://sigmarootpi.com/",
    author: {
      name: "Rishabh",
      email: "sigmarootpi@proton.me",
    },
  };

  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss",
    outputPath: "/feed/writing.xml",
    collection: { name: "writingFeed", limit: 10 },
    metadata: {
      ...feedMetadata,
      title: "Sigmarootpi Writing Feed",
    },
  });

  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss",
    outputPath: "/feed/movies.xml",
    collection: { name: "movieFeed", limit: 10 },
    metadata: {
      ...feedMetadata,
      title: "Sigmarootpi Movies Feed",
    },
  });

  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss",
    outputPath: "/feed/books.xml",
    collection: { name: "bookFeed", limit: 10 },
    metadata: {
      ...feedMetadata,
      title: "Sigmarootpi Books Feed",
    },
  });

  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss",
    outputPath: "/feed/snap.xml",
    collection: { name: "snapFeed", limit: 10 },
    metadata: {
      ...feedMetadata,
      title: "Sigmarootpi Snap Feed",
    },
  });

  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss",
    outputPath: "/feed/workout.xml",
    collection: { name: "workoutFeed", limit: 10 },
    metadata: {
      ...feedMetadata,
      title: "Sigmarootpi Workout Feed",
    },
  });

  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};
