const EleventyFetch = require("@11ty/eleventy-fetch");
const { parseStringPromise } = require("xml2js");

const FEEDS = [
  ["AppAddict", "Apps", "https://appaddict.app/feed.atom", "https://appaddict.app/"],
  ["FYFD", "Science", "https://fyfluiddynamics.com/feed/", "https://fyfluiddynamics.com/"],
  ["Collosal", "Arts", "https://www.thisiscolossal.com/feed/", "https://www.thisiscolossal.com/"],
].map(([label, tag, feedUrl, siteUrl]) => ({ label, tag, feedUrl, siteUrl }));
const latestFeedCache = new Map();
let externalFeedsPromise;

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);
const text = (value) =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : value?._ || value?.["#text"] || "";
const clean = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const image = (value) =>
  String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
const excerpt = (value, count = 22) => {
  const words = clean(value).split(" ").filter(Boolean);
  return words.length > count ? `${words.slice(0, count).join(" ")}...` : words.join(" ");
};

function fallback({ label, tag, siteUrl, feedUrl }) {
  return {
    label,
    tag,
    sourceUrl: siteUrl || feedUrl,
    postTitle: "Latest post",
    postUrl: siteUrl || feedUrl,
    excerpt: "Open site",
    imageUrl: "",
  };
}

async function readLatestFeedPost({ label, tag, feedUrl, siteUrl, duration = "1h" }) {
  const xml = await EleventyFetch(feedUrl, {
    duration,
    type: "text",
  });

  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    mergeAttrs: true,
  });

  if (parsed?.rss?.channel) {
    const item = list(parsed.rss.channel.item)[0];
    const body = text(item?.["content:encoded"]) || text(item?.description);
    return {
      label,
      tag,
      sourceUrl: siteUrl || feedUrl,
      postTitle: clean(text(item?.title)) || "Latest post",
      postUrl: text(item?.link) || siteUrl || feedUrl,
      excerpt: excerpt(body) || "Read the latest post.",
      imageUrl: image(body),
    };
  }

  if (parsed?.feed) {
    const entry = list(parsed.feed.entry)[0];
    const content = text(entry?.content) || text(entry?.summary);
    const postUrl =
      list(entry?.link).find((link) => link?.rel === "alternate" && link.href)?.href ||
      list(entry?.link).find((link) => link?.href)?.href ||
      siteUrl ||
      feedUrl;

    return {
      label,
      tag,
      sourceUrl: siteUrl || feedUrl,
      postTitle: clean(text(entry?.title)) || "Latest post",
      postUrl,
      excerpt: excerpt(text(entry?.summary) || content || text(entry?.subtitle)) || "Read the latest post.",
      imageUrl: image(content),
    };
  }

  throw new Error("Unsupported feed format");
}

async function readFeedPosts({ label, tag, feedUrl, siteUrl, duration = "1h", limit = 4 }) {
  const xml = await EleventyFetch(feedUrl, {
    duration,
    type: "text",
  });

  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
    mergeAttrs: true,
  });

  if (parsed?.rss?.channel) {
    return list(parsed.rss.channel.item)
      .slice(0, limit)
      .map((item) => {
        const body = text(item?.["content:encoded"]) || text(item?.description);
        return {
          label,
          tag,
          sourceUrl: siteUrl || feedUrl,
          postTitle: clean(text(item?.title)) || "Latest post",
          postUrl: text(item?.link) || siteUrl || feedUrl,
          excerpt: excerpt(body) || "Read the latest post.",
          imageUrl: image(body),
        };
      });
  }

  if (parsed?.feed) {
    return list(parsed.feed.entry)
      .slice(0, limit)
      .map((entry) => {
        const content = text(entry?.content) || text(entry?.summary);
        const postUrl =
          list(entry?.link).find((link) => link?.rel === "alternate" && link.href)?.href ||
          list(entry?.link).find((link) => link?.href)?.href ||
          siteUrl ||
          feedUrl;

        return {
          label,
          tag,
          sourceUrl: siteUrl || feedUrl,
          postTitle: clean(text(entry?.title)) || "Latest post",
          postUrl,
          excerpt: excerpt(text(entry?.summary) || content || text(entry?.subtitle)) || "Read the latest post.",
          imageUrl: image(content),
        };
      });
  }

  throw new Error("Unsupported feed format");
}

function getFeedCacheKey({ label, tag, feedUrl, siteUrl, duration = "1h" }) {
  return JSON.stringify({ label, tag, feedUrl, siteUrl, duration });
}

function readLatestFeedPostCached(source) {
  const key = getFeedCacheKey(source);

  if (!latestFeedCache.has(key)) {
    const request = readLatestFeedPost(source).catch((error) => {
      latestFeedCache.delete(key);
      throw error;
    });
    latestFeedCache.set(key, request);
  }

  return latestFeedCache.get(key);
}

function readFeedPostsCached(source) {
  const key = `${getFeedCacheKey(source)}::limit:${source.limit || 4}`;

  if (!latestFeedCache.has(key)) {
    const request = readFeedPosts(source).catch((error) => {
      latestFeedCache.delete(key);
      throw error;
    });
    latestFeedCache.set(key, request);
  }

  return latestFeedCache.get(key);
}

async function getExternalFeeds() {
  if (!externalFeedsPromise) {
    externalFeedsPromise = Promise.all(
      FEEDS.map(async (source) => {
        try {
          return await readLatestFeedPostCached(source);
        } catch {
          return fallback(source);
        }
      })
    ).catch((error) => {
      externalFeedsPromise = null;
      throw error;
    });
  }

  return externalFeedsPromise;
}

module.exports = getExternalFeeds;
module.exports.getExternalFeeds = getExternalFeeds;
module.exports.readLatestFeedPost = readLatestFeedPostCached;
module.exports.readFeedPosts = readFeedPostsCached;
