const fs = require("fs");
const path = require("path");
const { parseStringPromise } = require("xml2js");

const INPUT_FILES = process.argv.slice(2);
const WORKOUT_DIR = path.join(process.cwd(), "src", "workout");
const DEFAULT_RUNGAP_SOURCE_DIR = process.env.RUNGAP_SOURCE_DIR || "";
const WORKOUT_METADATA_FIELDS = [
  "workout_type",
  "distance",
  "duration",
  "calories",
  "average_heart_rate",
  "source",
];

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function readText(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value._ !== "undefined") return String(value._);
  return "";
}

function toSlug(value) {
  return String(value || "workout")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDurationFromSeconds(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatDistanceKm(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return "";
  return (meters / 1000).toFixed(2);
}

function buildFrontMatter(data) {
  const lines = [
    "---",
    `title: "${data.title}"`,
    `date: ${data.date}`,
    `source_file: "${data.originalFile}"`,
  ];
  lines.push("---", "");

  return lines.join("\n");
}

function parseSimpleFrontMatter(fileContent) {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: fileContent };
  }

  const [, rawFrontMatter, body] = match;
  const data = {};

  rawFrontMatter.split("\n").forEach((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    data[key] = value;
  });

  return { data, body };
}

function stringifyFrontMatterValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number") return String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function buildSimpleFrontMatter(data) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (value == null || value === "") continue;
    lines.push(`${key}: ${stringifyFrontMatterValue(value)}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

function formatPace(distanceKm, totalSeconds) {
  if (!Number(distanceKm) || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return "";

  const secondsPerKm = totalSeconds / Number(distanceKm);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${pad(seconds)} min/km`;
}

function getTrackPointTimes(trackPoints) {
  return trackPoints
    .map((point) => new Date(readText(point.Time)))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);
}

async function parseTcx(filePath, xml) {
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true,
  });

  const activity = ensureArray(parsed?.TrainingCenterDatabase?.Activities?.Activity)[0];
  if (!activity) throw new Error("No Activity found in TCX file.");

  const laps = ensureArray(activity.Lap);
  const startTime = new Date(readText(activity.Id));
  const validStartTime = Number.isNaN(startTime.getTime()) ? new Date() : startTime;

  const totalSeconds = laps.reduce((sum, lap) => sum + Number(readText(lap.TotalTimeSeconds) || 0), 0);
  const totalMeters = laps.reduce((sum, lap) => sum + Number(readText(lap.DistanceMeters) || 0), 0);
  const totalCalories = laps.reduce((sum, lap) => sum + Number(readText(lap.Calories) || 0), 0);

  const averageHeartRates = laps
    .map((lap) => Number(readText(lap.AverageHeartRateBpm?.Value) || 0))
    .filter((value) => value > 0);

  const averageHeartRate = averageHeartRates.length
    ? Math.round(averageHeartRates.reduce((sum, value) => sum + value, 0) / averageHeartRates.length)
    : "";

  const workoutType = activity.Sport || "Workout";

  return {
    title: `${workoutType} workout`,
    date: formatDate(validStartTime),
    workoutType,
    distance: formatDistanceKm(totalMeters),
    duration: formatDurationFromSeconds(totalSeconds),
    calories: totalCalories || "",
    averageHeartRate,
    format: "TCX",
    originalFile: path.basename(filePath),
  };
}

async function parseGpx(filePath, xml) {
  const parsed = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true,
  });

  const track = ensureArray(parsed?.gpx?.trk)[0];
  const segments = ensureArray(track?.trkseg);
  const trackPoints = segments.flatMap((segment) => ensureArray(segment?.trkpt));
  const pointTimes = getTrackPointTimes(trackPoints);

  const startTime = pointTimes[0] || new Date(readText(parsed?.gpx?.metadata?.time)) || new Date();
  const endTime = pointTimes[pointTimes.length - 1] || startTime;
  const durationSeconds = Math.max(0, (endTime - startTime) / 1000);
  const workoutType = readText(track?.type) || "Workout";
  const title = readText(track?.name) || `${workoutType} workout`;

  return {
    title,
    date: formatDate(startTime),
    workoutType,
    distance: "",
    duration: formatDurationFromSeconds(durationSeconds),
    calories: "",
    averageHeartRate: "",
    format: "GPX",
    originalFile: path.basename(filePath),
  };
}

function parseRunGapBundleMetadata(filePath, rawJson) {
  const metadata = JSON.parse(rawJson);
  const startTime = new Date(metadata?.startTime?.time || metadata?.startTime || Date.now());
  const validStartTime = Number.isNaN(startTime.getTime()) ? new Date() : startTime;
  const workoutType =
    metadata?.activityType?.internalName ||
    metadata?.title ||
    "Workout";
  const distanceKm = formatDistanceKm(Number(metadata?.distance || 0));
  const duration = formatDurationFromSeconds(Number(metadata?.duration || 0));

  return {
    title: metadata?.title || `${workoutType} workout`,
    date: formatDate(validStartTime),
    workoutType,
    distance: distanceKm,
    duration,
    calories: Number(metadata?.calories || 0) || "",
    averageHeartRate: Number(metadata?.avgHeartrate || metadata?.avgheartrate || 0) || "",
    averagePace: formatPace(distanceKm, Number(metadata?.duration || 0)),
    sourceName: metadata?.source || "RunGap",
    format: "bundle metadata",
    originalFile: path.basename(filePath),
  };
}

function findRunGapMetadataFile(directoryPath) {
  const files = fs.readdirSync(directoryPath);
  const metadataFile = files.find((file) => file.endsWith(".metadata.json"));
  if (!metadataFile) {
    throw new Error(`No .metadata.json file found in ${directoryPath}`);
  }
  return path.join(directoryPath, metadataFile);
}

function findRunGapMetadataPathByBasename(fileName, baseDirectory = DEFAULT_RUNGAP_SOURCE_DIR) {
  if (!fileName || !fs.existsSync(baseDirectory)) return null;

  for (const entry of fs.readdirSync(baseDirectory)) {
    const entryPath = path.join(baseDirectory, entry);
    try {
      if (!fs.statSync(entryPath).isDirectory()) continue;
      const candidatePath = path.join(entryPath, fileName);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function resolveRunGapSourcePath(sourceReference, baseDirectory = DEFAULT_RUNGAP_SOURCE_DIR) {
  if (!sourceReference) return null;

  const absolutePath = path.isAbsolute(sourceReference)
    ? sourceReference
    : path.join(process.cwd(), sourceReference);

  if (fs.existsSync(absolutePath)) return absolutePath;

  return findRunGapMetadataPathByBasename(path.basename(sourceReference), baseDirectory);
}

async function parseRunGapFile(filePath) {
  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    const metadataFile = findRunGapMetadataFile(filePath);
    return parseRunGapBundleMetadata(metadataFile, fs.readFileSync(metadataFile, "utf8"));
  }

  const extension = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, "utf8");

  if (filePath.endsWith(".metadata.json") || filePath.endsWith(".rungap.json")) {
    return parseRunGapBundleMetadata(filePath, raw);
  }

  if (extension === ".tcx") return parseTcx(filePath, raw);
  if (extension === ".gpx") return parseGpx(filePath, raw);

  throw new Error(`Unsupported file format: ${extension}. Use a RunGap bundle folder, .metadata.json, .rungap.json, TCX, or GPX file.`);
}

function buildOutputPath(workout) {
  const slug = toSlug(workout.workoutType);
  return path.join(WORKOUT_DIR, `${workout.date}-${slug}.md`);
}

async function importFile(filePath) {
  const workout = await parseRunGapFile(filePath);
  const outputPath = buildOutputPath(workout);

  if (fs.existsSync(outputPath)) {
    return;
  }

  const content = buildFrontMatter(workout);
  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`Created ${path.relative(process.cwd(), outputPath)}`);
}

async function syncWorkoutMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, body } = parseSimpleFrontMatter(raw);
  const sourceReference = data.source_file || data.original_file;

  if (!sourceReference) return false;

  const resolvedPath = resolveRunGapSourcePath(sourceReference);
  if (!resolvedPath) return false;

  const workout = await parseRunGapFile(resolvedPath);
  const nextData = { ...data };

  nextData.date = data.date || workout.date;
  nextData.workout_type = workout.workoutType || "";
  nextData.distance = workout.distance || "";
  nextData.duration = workout.duration || "";
  nextData.calories = workout.calories || "";
  nextData.average_heart_rate = workout.averageHeartRate || "";
  nextData.source = workout.sourceName || "RunGap";
  nextData.source_file = data.source_file || workout.originalFile;

  const nextContent = `${buildSimpleFrontMatter(nextData)}${body.replace(/^\n*/, "")}`;
  if (nextContent === raw) return false;

  fs.writeFileSync(filePath, nextContent, "utf8");
  return true;
}

async function syncWorkoutMarkdownDirectory(directoryPath = WORKOUT_DIR) {
  if (!fs.existsSync(directoryPath)) return;

  const workoutFiles = fs.readdirSync(directoryPath)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(directoryPath, file))
    .sort();

  for (const filePath of workoutFiles) {
    await syncWorkoutMarkdownFile(filePath);
  }
}

function getRunGapBundlePaths(baseDirectory = DEFAULT_RUNGAP_SOURCE_DIR) {
  if (!fs.existsSync(baseDirectory)) return [];

  return fs.readdirSync(baseDirectory)
    .map((entry) => path.join(baseDirectory, entry))
    .filter((entryPath) => {
      try {
        return fs.statSync(entryPath).isDirectory() && fs.readdirSync(entryPath).some((file) => file.endsWith(".metadata.json"));
      } catch {
        return false;
      }
    })
    .sort();
}

async function importRunGapDirectory(baseDirectory = DEFAULT_RUNGAP_SOURCE_DIR) {
  const bundlePaths = getRunGapBundlePaths(baseDirectory);
  for (const bundlePath of bundlePaths) {
    await importFile(bundlePath);
  }
}

async function syncAllWorkouts(baseDirectory = DEFAULT_RUNGAP_SOURCE_DIR) {
  await importRunGapDirectory(baseDirectory);
  await syncWorkoutMarkdownDirectory();
}

async function main() {
  const syncMode = INPUT_FILES.includes("--sync") || INPUT_FILES.includes("--sync-all");
  const fileArgs = INPUT_FILES.filter((value) => value !== "--sync" && value !== "--sync-all");

  if (syncMode || !INPUT_FILES.length) {
    const sourceDirectory = fileArgs[0] ? path.resolve(fileArgs[0]) : DEFAULT_RUNGAP_SOURCE_DIR;
    await syncAllWorkouts(sourceDirectory);
    console.log("RunGap sync complete.");
    return;
  }

  for (const filePath of fileArgs) {
    await importFile(path.resolve(filePath));
  }

  await syncWorkoutMarkdownDirectory();
  console.log("RunGap import complete.");
}

module.exports = {
  importFile,
  importRunGapDirectory,
  parseRunGapFile,
  getRunGapBundlePaths,
  resolveRunGapSourcePath,
  syncAllWorkouts,
  syncWorkoutMarkdownDirectory,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
