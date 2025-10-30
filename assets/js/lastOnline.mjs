import fs from "fs";
import { globSync } from "glob";
import { DateTime } from "luxon";

export default function getLastOnline() {
  // 1️⃣ Scan all Markdown files in src/
  const files = globSync("src/**/*.md");
  let latestFileTime = 0;

  for (const file of files) {
    const stats = fs.statSync(file);
    if (stats.mtimeMs > latestFileTime) {
      latestFileTime = stats.mtimeMs;
    }
  }
  // 2️⃣ Convert to Date object (UTC-safe)
  const latestFileDT = DateTime.fromMillis(latestFileTime, { zone: "utc" });
  return latestFileDT.toJSDate();
}
