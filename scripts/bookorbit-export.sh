#!/usr/bin/env bash
# Exports the BookOrbit "currently reading" shelf into the blog, so the static
# pages can show covers with reading progress. Run via publish-shelves.sh,
# which commits and pushes.
#
#   src/_data/currentlyReading.json   -> global `currentlyReading` in templates
#   assets/images/reading/<id>.jpg    -> resized covers
#
# Reads BookOrbit's Postgres through `docker exec` over the container's local
# socket, so no password or token is needed here. Only rewrites files whose
# content changed, so an unchanged shelf leaves git clean.
set -euo pipefail

# SHELF_REPO: the checkout to write into (publish-shelves.sh sets it).
REPO=${SHELF_REPO:-$(cd "$(dirname "$0")/.." && pwd)}
COVERS_SRC=${BOOKORBIT_COVERS:-/home/rpi/portainer/Files/AppData/Config/BookOrbit/app/covers}
USER_ID=${BOOKORBIT_USER_ID:-1}
DATA_FILE=src/_data/currentlyReading.json
COVERS_DIR=assets/images/reading

cd "$REPO"

SQL="
SELECT s.book_id,
       COALESCE(m.title, 'Untitled'),
       COALESCE(a.names, ''),
       ROUND(GREATEST(COALESCE(p.percent, 0), COALESCE(ap.percentage, 0)))
FROM user_book_status s
LEFT JOIN book_metadata m ON m.book_id = s.book_id
LEFT JOIN LATERAL (
  SELECT string_agg(au.name, ', ' ORDER BY ba.display_order, au.name) AS names
  FROM book_authors ba
  JOIN authors au ON au.id = ba.author_id
  WHERE ba.book_id = s.book_id
) a ON true
LEFT JOIN LATERAL (
  SELECT MAX(rp.percentage) AS percent, MAX(rp.last_read_at) AS last_read
  FROM reading_progress rp
  JOIN book_files bf ON bf.id = rp.book_file_id
  WHERE bf.book_id = s.book_id AND rp.user_id = s.user_id
) p ON true
LEFT JOIN audiobook_progress ap
  ON ap.book_id = s.book_id AND ap.user_id = s.user_id
WHERE s.status = 'reading' AND s.user_id = $USER_ID
ORDER BY GREATEST(COALESCE(p.last_read, s.updated_at),
                  COALESCE(ap.updated_at, s.updated_at)) DESC;"

docker exec bookorbit-db psql -U bookorbit -d bookorbit -At -F$'\t' -c "$SQL" \
  | COVERS_SRC="$COVERS_SRC" DATA_FILE="$DATA_FILE" COVERS_DIR="$COVERS_DIR" python3 -c '
import io, json, os, sys
from PIL import Image

src_root = os.environ["COVERS_SRC"]
covers_dir = os.environ["COVERS_DIR"]
data_file = os.environ["DATA_FILE"]
os.makedirs(covers_dir, exist_ok=True)

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

books, keep = [], set()
for line in sys.stdin:
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 4:
        continue
    bid, title, authors, pct = parts[:4]
    try:
        percent = max(0, min(100, int(float(pct))))
    except ValueError:
        percent = 0
    entry = {"title": title, "authors": authors, "percent": percent, "cover": ""}

    # A manually uploaded cover wins; downscale it so the repo stays small.
    for name in ("cover_custom.jpg", "cover_extracted.jpg", "thumbnail.jpg"):
        src = os.path.join(src_root, bid, name)
        if not os.path.exists(src):
            continue
        img = Image.open(src).convert("RGB")
        img.thumbnail((400, 600))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=82, optimize=True)
        fname = bid + ".jpg"
        write_if_changed(os.path.join(covers_dir, fname), buf.getvalue())
        entry["cover"] = "/" + covers_dir + "/" + fname
        keep.add(fname)
        break

    books.append(entry)

# Drop covers of books no longer on the shelf.
for f in os.listdir(covers_dir):
    if f not in keep:
        os.remove(os.path.join(covers_dir, f))

out = json.dumps({"books": books}, indent=2, ensure_ascii=False) + "\n"
write_if_changed(data_file, out.encode("utf-8"))
'

