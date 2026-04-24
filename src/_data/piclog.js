const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const profileId = "571";
const feedUrl = `https://piclog.blue/user-feed.php?id=${profileId}`;
const cachePath = path.join(process.cwd(), ".cache", "piclog-cache.json");
const localDir = path.join(process.cwd(), "assets", "images");

const fallback = {
  image: null,
  title: "Picture of the Day",
  link: `https://piclog.blue/profile.php?id=${profileId}`,
  description: "Visit Piclog profile for the latest picture.",
};

function curlText(url) {
  return execFileSync("curl", ["-L", "-s", url], {
    encoding: "utf8",
    maxBuffer: 5 * 1024 * 1024,
  });
}

function curlBinary(url) {
  return execFileSync("curl", ["-L", "-s", url], {
    encoding: "buffer",
    maxBuffer: 30 * 1024 * 1024,
  });
}

function decodeHtml(input) {
  return String(input || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const nextCache = JSON.stringify(data, null, 2) + "\n";
    const currentCache = fs.existsSync(cachePath) ? fs.readFileSync(cachePath, "utf8") : "";

    if (currentCache !== nextCache) {
      fs.writeFileSync(cachePath, nextCache, "utf8");
    }
  } catch {
    // Ignore cache write errors.
  }
}

function writeBinaryFileIfChanged(filePath, nextBuffer) {
  if (fs.existsSync(filePath)) {
    const currentBuffer = fs.readFileSync(filePath);
    if (Buffer.compare(currentBuffer, nextBuffer) === 0) {
      return false;
    }
  }

  fs.writeFileSync(filePath, nextBuffer);
  return true;
}

function extractImageFromPage(html, pageUrl) {
  const articleImageMatch = html.match(/<article[\s\S]*?<img\s+src="([^"]+)"\s*\/?>/i);
  if (articleImageMatch) {
    return new URL(articleImageMatch[1], pageUrl).toString();
  }

  const uploadsImageMatch = html.match(/<img\s+src="([^"]*uploads\/[^"]+)"\s*\/?>/i);
  if (uploadsImageMatch) {
    return new URL(uploadsImageMatch[1], pageUrl).toString();
  }

  const fallbackMatch = html.match(/<img\s+src="([^"]+)"\s*\/?>/i);
  if (!fallbackMatch) return "";
  return new URL(fallbackMatch[1], pageUrl).toString();
}

function extractDescriptionFromPage(html) {
  const match = html.match(/<p class="description">([\s\S]*?)<\/p>/i);
  if (!match) return "";
  return decodeHtml(match[1]).replace(/\s+/g, " ").trim();
}

module.exports = async function getPiclog() {
  const cached = readCache();

  try {
    const feedXml = curlText(feedUrl);
    const itemBlockMatch = feedXml.match(/<item>([\s\S]*?)<\/item>/i);
    if (!itemBlockMatch) throw new Error("No piclog item found");
    const itemBlock = itemBlockMatch[1];
    const titleMatch = itemBlock.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = itemBlock.match(/<link>([\s\S]*?)<\/link>/i) || itemBlock.match(/<guid>([\s\S]*?)<\/guid>/i);

    const itemTitle = decodeHtml(titleMatch ? titleMatch[1] : "Picture of the Day").trim();
    const itemLink = decodeHtml(linkMatch ? linkMatch[1] : fallback.link).trim();
    const pageHtml = curlText(itemLink);
    const remoteImageUrl = extractImageFromPage(pageHtml, itemLink);
    const itemDescription = extractDescriptionFromPage(pageHtml);

    if (!remoteImageUrl) throw new Error("No image URL found on piclog page");

    const imageBuffer = curlBinary(remoteImageUrl);
    const extFromUrl = path.extname(new URL(remoteImageUrl).pathname) || ".jpg";
    const safeExt = extFromUrl.toLowerCase().slice(0, 5).match(/^\.[a-z0-9]+$/)
      ? extFromUrl.toLowerCase()
      : ".jpg";

    fs.mkdirSync(localDir, { recursive: true });
    const localFilename = `piclog-latest${safeExt}`;
    const localPath = path.join(localDir, localFilename);
    writeBinaryFileIfChanged(localPath, imageBuffer);

    const output = {
      image: `/assets/images/${localFilename}`,
      title: itemTitle,
      link: itemLink,
      description: itemDescription || fallback.description,
      remoteImage: remoteImageUrl,
    };

    writeCache(output);
    return output;
  } catch {
    if (cached && cached.image) return cached;
    return fallback;
  }
};
