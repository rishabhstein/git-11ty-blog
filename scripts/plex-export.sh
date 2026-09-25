#!/usr/bin/env bash
# Exports Plex "Continue Watching" into the blog, so the static pages can show
# posters with watch progress. Run via publish-shelves.sh, which commits and
# pushes.
#
#   src/_data/continueWatching.json   -> global `continueWatching` in templates
#   assets/images/watching/<id>.jpg   -> posters
#   src/_data/lastPlayed.json         -> last song played and its album, for
#                                        the status strip and /last-played/
#   assets/images/last-played/        -> that album's cover (small + large)
#
# The Plex token comes from ~/.config/plex/plex.env (PLEX_URL, PLEX_TOKEN),
# outside this repo. Posters are downloaded here and committed as plain files,
# so no token or Plex URL ever reaches the site. Only items from the libraries
# in PLEX_LIBRARIES are published. Movies show progress through the film;
# series show progress through the whole show (episodes watched / total).
set -euo pipefail

# SHELF_REPO: the checkout to write into (publish-shelves.sh sets it).
REPO=${SHELF_REPO:-$(cd "$(dirname "$0")/.." && pwd)}
ENV_FILE=${PLEX_ENV_FILE:-$HOME/.config/plex/plex.env}
# shellcheck disable=SC1090
. "$ENV_FILE"
export PLEX_URL PLEX_TOKEN
export PLEX_LIBRARIES=${PLEX_LIBRARIES:-Movies,TV Shows}
export DATA_FILE=src/_data/continueWatching.json
export COVERS_DIR=assets/images/watching
export LAST_PLAYED_FILE=src/_data/lastPlayed.json
export LAST_PLAYED_DIR=assets/images/last-played
export PLEX_ACCOUNT_ID=${PLEX_ACCOUNT_ID:-1}

cd "$REPO"

python3 - <<'EOF'
import datetime, io, json, os, urllib.parse, urllib.request
from PIL import Image

base = os.environ["PLEX_URL"].rstrip("/")
token = os.environ["PLEX_TOKEN"]
libraries = {s.strip() for s in os.environ["PLEX_LIBRARIES"].split(",") if s.strip()}
covers_dir = os.environ["COVERS_DIR"]
data_file = os.environ["DATA_FILE"]
last_played_file = os.environ["LAST_PLAYED_FILE"]
last_played_dir = os.environ["LAST_PLAYED_DIR"]
os.makedirs(covers_dir, exist_ok=True)

def get(path):
    req = urllib.request.Request(base + path, headers={"Accept": "application/json", "X-Plex-Token": token})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()

def write_if_changed(path, data):
    try:
        with open(path, "rb") as fh:
            if fh.read() == data:
                return
    except FileNotFoundError:
        pass
    tmp = path + ".tmp"
    with open(tmp, "wb") as fh:
        fh.write(data)
    os.replace(tmp, path)

mc = json.loads(get("/hubs/continueWatching"))["MediaContainer"]
# Some PMS versions return the list flat, others wrap it in a single Hub.
items = mc.get("Metadata") or ((mc.get("Hub") or [{}])[0].get("Metadata") or [])

out, keep = [], set()
for m in items:
    if m.get("librarySectionTitle") not in libraries:
        continue
    entry = {"title": m.get("title", ""), "year": m.get("year")}
    poster, key = m.get("thumb", ""), m.get("ratingKey", "")
    if m.get("type") == "episode":
        # Series poster rather than the episode still keeps every card 2:3.
        entry["title"] = m.get("grandparentTitle", entry["title"])
        entry["episode"] = "S%02dE%02d" % (m.get("parentIndex", 0), m.get("index", 0))
        poster = m.get("grandparentThumb") or poster
        key = m.get("grandparentRatingKey") or key
    duration = m.get("duration") or 0
    fraction = (m.get("viewOffset") or 0) / duration if duration else 0
    if m.get("type") == "episode":
        # For a series, progress is through the show: episodes watched plus the
        # part of the current one, out of all episodes in the library.
        try:
            show = json.loads(get("/library/metadata/" + key))["MediaContainer"]["Metadata"][0]
            total = show.get("leafCount") or 0
            if total:
                fraction = ((show.get("viewedLeafCount") or 0) + fraction) / total
        except (OSError, KeyError, IndexError, ValueError):
            pass
    entry["percent"] = max(0, min(100, int(fraction * 100)))
    entry["cover"] = ""

    if poster:
        fname = key + ".jpg"
        qs = urllib.parse.urlencode({"width": 400, "height": 600, "minSize": 1, "upscale": 1, "url": poster})
        try:
            img = Image.open(io.BytesIO(get("/photo/:/transcode?" + qs))).convert("RGB")
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=82, optimize=True)
            write_if_changed(os.path.join(covers_dir, fname), buf.getvalue())
            entry["cover"] = "/" + covers_dir + "/" + fname
            keep.add(fname)
        except OSError:
            pass
    out.append(entry)

# Drop posters of things no longer in progress.
for f in os.listdir(covers_dir):
    if f not in keep:
        os.remove(os.path.join(covers_dir, f))

data = json.dumps({"items": out}, indent=2, ensure_ascii=False) + "\n"
write_if_changed(data_file, data.encode("utf-8"))

# Last played song, shown as a text update in the home page status strip.
# Only the server owner's plays (account 1 unless PLEX_ACCOUNT_ID says otherwise).
try:
    sections = json.loads(get("/library/sections"))["MediaContainer"]["Directory"]
    music = [d["key"] for d in sections if d.get("type") == "artist"]
    track = None
    if music:
        qs = urllib.parse.urlencode({
            "librarySectionID": music[0], "accountID": os.environ["PLEX_ACCOUNT_ID"],
            "sort": "viewedAt:desc", "X-Plex-Container-Start": 0, "X-Plex-Container-Size": 1})
        history = json.loads(get("/status/sessions/history/all?" + qs))["MediaContainer"].get("Metadata") or []
        track = history[0] if history else None
except (OSError, KeyError, ValueError):
    track = None

def fmt_duration(ms):
    secs = int((ms or 0) / 1000)
    return "%d:%02d" % (secs // 60, secs % 60) if secs else ""

def save_cover(thumb, size, path):
    qs = urllib.parse.urlencode({"width": size, "height": size, "minSize": 1, "upscale": 1, "url": thumb})
    img = Image.open(io.BytesIO(get("/photo/:/transcode?" + qs))).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85, optimize=True)
    write_if_changed(path, buf.getvalue())

def meta(key):
    return json.loads(get("/library/metadata/" + key))["MediaContainer"]["Metadata"][0]

if track:
    played = datetime.datetime.fromtimestamp(track["viewedAt"], datetime.timezone.utc)
    # History rows are thin; the track itself knows its album and track artist.
    try:
        full = meta(track["ratingKey"])
    except (OSError, KeyError, IndexError, ValueError):
        full = track
    album_artist = full.get("grandparentTitle", "")
    song = {
        "title": full.get("title", ""),
        # originalTitle holds the track artist when it differs from the album's.
        "artist": full.get("originalTitle") or album_artist,
        "playedAt": played.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "playedDate": played.astimezone().strftime("%b %-d, %Y"),
        "trackNumber": full.get("index"),
        "duration": fmt_duration(full.get("duration")),
        "cover": "",
        "album": None,
    }

    os.makedirs(last_played_dir, exist_ok=True)
    keep = set()
    album_key = full.get("parentRatingKey")
    if album_key:
        try:
            album = meta(album_key)
            tracks = json.loads(get("/library/metadata/%s/children" % album_key))["MediaContainer"].get("Metadata") or []
            song["album"] = {
                "title": album.get("title", ""),
                "artist": album.get("parentTitle", album_artist),
                "year": album.get("year"),
                "released": album.get("originallyAvailableAt", ""),
                "label": album.get("studio", ""),
                "genres": [g["tag"] for g in album.get("Genre", [])],
                "summary": album.get("summary", ""),
                "plays": album.get("viewCount", 0),
                "cover": "",
                "tracks": [{
                    "number": t.get("index"),
                    "title": t.get("title", ""),
                    "artist": t.get("originalTitle", ""),
                    "duration": fmt_duration(t.get("duration")),
                    "current": t.get("ratingKey") == full.get("ratingKey"),
                } for t in tracks],
            }
            thumb = album.get("thumb") or full.get("parentThumb")
            if thumb:
                # Small one for the home page strip, large one for the album page.
                for size, suffix, field in ((96, "-sm", None), (300, "", "album")):
                    fname = album_key + suffix + ".jpg"
                    save_cover(thumb, size, os.path.join(last_played_dir, fname))
                    keep.add(fname)
                    url = "/" + last_played_dir + "/" + fname
                    if field:
                        song["album"]["cover"] = url
                    else:
                        song["cover"] = url
        except (OSError, KeyError, IndexError, ValueError):
            pass

    # Only the current album's covers are kept.
    for f in os.listdir(last_played_dir):
        if f not in keep:
            os.remove(os.path.join(last_played_dir, f))
    data = json.dumps(song, indent=2, ensure_ascii=False) + "\n"
    write_if_changed(last_played_file, data.encode("utf-8"))
EOF
