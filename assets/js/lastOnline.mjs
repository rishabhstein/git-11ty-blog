import fs from "fs";
import { globSync } from "glob";
import EleventyFetch from "@11ty/eleventy-fetch";
import { parseStringPromise } from "xml2js";
import { DateTime } from "luxon";

export default async function getLastOnline() {
  // 1️⃣ Scan all markdown files
  const files = globSync("src/**/*.md");
  let latestFileTime = 0;
  for (const file of files) {
    const stats = fs.statSync(file);
    if (stats.mtimeMs > latestFileTime) latestFileTime = stats.mtimeMs;
  }

  // 2️⃣ Fetch Status.cafe Atom feed
  const statusCafeURL = "https://status.cafe/users/sigmarootpi.atom";
  let latestStatusTime = 0;

  try {
    const xmlData = await EleventyFetch(statusCafeURL, {
      duration: "1h",
      type: "text",
    });

    const parsed = await parseStringPromise(xmlData);
    const entries = parsed.feed.entry;

    if (entries?.length) {
      const latestEntry = entries[0];
      const timestamp = latestEntry.updated?.[0] || latestEntry.published?.[0];

      // Safely parse with Luxon
      const dt = DateTime.fromISO(timestamp, { zone: "utc" });
      if (dt.isValid) latestStatusTime = dt.toMillis();
      else console.warn("⚠️ Invalid Status.cafe timestamp:", timestamp);
    }
  } catch (err) {
    console.warn("⚠️ Could not fetch Status.cafe feed, using last post only:", err.message);
    latestStatusTime = 0; // fallback to last post
  }

  // 3️⃣ Determine the latest activity
  const latestFileDT = DateTime.fromMillis(latestFileTime, { zone: "utc" });
  const latestStatusDT = DateTime.fromMillis(latestStatusTime || 0, { zone: "utc" });
  const latestActivity = latestFileDT > latestStatusDT ? latestFileDT.toJSDate() : latestStatusDT.toJSDate();

  return latestActivity;
}
