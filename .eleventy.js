const fs = require("fs");
const path = require("path");

module.exports = async function(eleventyConfig) {
  const sortNewestFirst = (items) => [...(Array.isArray(items) ? items : [])].sort((a, b) => b.date - a.date);
  const uniqueYearsDescending = (items) =>
    [...new Set((Array.isArray(items) ? items : []).map((item) => item.date.getFullYear()))].sort((a, b) => b - a);
  const secondsInDay = 24 * 60 * 60 * 1000;

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

  function normalizeWorkoutDay(dateValue) {
    const date = new Date(dateValue);
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

    const addPathsFromDirectory = (directoryPath, fileFilter = () => true) => {
      if (!directoryPath || !fs.existsSync(directoryPath)) return;

      fs.readdirSync(directoryPath)
        .filter((fileName) => fileName.endsWith(".svg") && fileFilter(fileName))
        .sort()
        .forEach((fileName) => addPath(path.join(directoryPath, fileName)));
    };

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

    if (assetWorkoutDir) {
      const preferredNames = ["heart-rate.svg", "power.svg", "cadence.svg"];
      for (const fileName of preferredNames) {
        const candidatePath = path.join(assetWorkoutDir, fileName);
        if (fs.existsSync(candidatePath)) addPath(candidatePath);
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
  const markdownItMark = require("markdown-it-mark");

  //Just copy these files to _site
  eleventyConfig.addPassthroughCopy('./assets');
  eleventyConfig.addPassthroughCopy('./src/style.css');
  eleventyConfig.addPassthroughCopy('./src/robots.txt');

  // Creating a datetime format filter
  eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toLocaleString(DateTime.DATE_MED);
  });

  // Using RenderPlugin
  eleventyConfig.addPlugin(EleventyRenderPlugin);

  // Creating a Markdown filter
  const md = markdownIt({
    html: true,
    breaks: true,
    linkify: true
  }).use(markdownItMark); // 👈 enables ==highlight== syntax

  eleventyConfig.addFilter("markdownify", (value) => {
    return md.render(value || "");
  });


  // Filtering only few words
  eleventyConfig.addFilter("wordLimit", function(content, limit = 50) {
    if (!content) return "";
    const words = content.split(/\s+/).slice(0, limit);
    return words.join(" ") + "...";
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

  eleventyConfig.addFilter("formatNumber", function(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString() : value;
  });

  eleventyConfig.addNunjucksAsyncShortcode("workoutPlots", async function(inputPath, explicitPaths = []) {
    return renderWorkoutPlotFigures(inputPath, explicitPaths);
  });

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

  // Collection for all unique tags
  eleventyConfig.addCollection("tagList", function(collection) {
    const tagsSet = new Set();
    collection.getAll().forEach(item => {
      (item.data.tags || []).forEach(tag => tagsSet.add(tag));
    });
    return [...tagsSet];
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

  eleventyConfig.addCollection("postArchiveYears", function(collectionApi) {
    return uniqueYearsDescending(collectionApi.getFilteredByTag("post"));
  });

  eleventyConfig.addCollection("bookArchive", function(collectionApi) {
    return sortNewestFirst(collectionApi.getFilteredByTag("books"));
  });

  eleventyConfig.addCollection("bookArchiveYears", function(collectionApi) {
    return uniqueYearsDescending(collectionApi.getFilteredByTag("books"));
  });

  eleventyConfig.addCollection("movieArchive", function(collectionApi) {
    return sortNewestFirst(collectionApi.getFilteredByTag("movies"));
  });

  eleventyConfig.addCollection("movieArchiveYears", function(collectionApi) {
    return uniqueYearsDescending(collectionApi.getFilteredByTag("movies"));
  });

  eleventyConfig.addCollection("workoutArchive", function(collectionApi) {
    return sortNewestFirst(collectionApi.getFilteredByTag("workout"));
  });

  eleventyConfig.addCollection("workoutArchiveYears", function(collectionApi) {
    return uniqueYearsDescending(collectionApi.getFilteredByTag("workout"));
  });

  // // Adding RSS feed and Combined feed collection
  eleventyConfig.addCollection("combinedFeed", function (collectionApi) {
    return [
      ...collectionApi.getFilteredByTag("post"),
      ...collectionApi.getFilteredByTag("snap"),
      ...collectionApi.getFilteredByTag("books"),
      ...collectionApi.getFilteredByTag("movies"),
      ...collectionApi.getFilteredByTag("microfeed"),
    ].sort((a, b) => a.date - b.date); // Sort descending by date
  });

  //================================================//

  eleventyConfig.addPlugin(feedPlugin, {
  type: "rss",
  outputPath: "/feed.xml",
  collection: {
    name: "combinedFeed",
    limit: 30,
  },
  metadata: {
    language: "en",
    title: "Sigmarootpi",
    subtitle: "An outdated habbit of spitting my thoughts.",
    base: "https://sigmarootpi.com/",
    author: {
      name: "Rishabh",
      email: "hello@sigmarootpi.com",
    },
  },

  items: {
    pubDate: item =>
      DateTime
        .fromJSDate(item.page.date, { zone: "EU/Brussels" })
        .toRFC2822(),
  },


  postRender: (item) => {
    // Append "Reply via email" link after each post content
        // Encode the title to be safe for URL
    const subject = encodeURIComponent(item.data.title || "Your Post");

    return (
      item.templateContent +
      `<p><a href="mailto:hello@sigmarootpi.com?subject=${subject}Reply to your post">Reply via email</a></p>`
    );
  },
});



  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};
