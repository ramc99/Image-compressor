# ImageShrink — Session Notes

## Project Overview
Flask-based image compression and enhancement web app.
Upload JPG/PNG → adjust settings → download compressed output.

## Tech Stack
- **Backend:** Python 3, Flask ≥ 2.0
- **Image processing:** Pillow ≥ 9.0
- **Frontend:** Vanilla JS, HTML5, CSS3 (no frameworks)

## Architecture

```
image-compressor/
├── app.py                  # Flask routes + image processing logic
├── requirements.txt
├── templates/
│   └── index.html          # Single-page UI
├── static/
│   ├── style.css
│   └── script.js
├── uploads/                # Original files (git-ignored)
└── compressed/             # Processed output (git-ignored)
```

### File naming convention
- Originals:   `{12-char-uuid}_orig.{ext}`
- Compressed:  `{12-char-uuid}_comp.{ext}`   ← ext changes with output format

### API endpoints
| Method | Route | Purpose |
|--------|-------|---------|
| GET  | `/` | Serve UI |
| POST | `/upload` | Save original, apply default compression, return `file_id` |
| POST | `/process` | Re-process stored original with user settings, return new compressed info |
| GET  | `/image/original/<filename>` | Serve original for preview |
| GET  | `/image/compressed/<filename>` | Serve compressed for preview |
| GET  | `/download/<filename>` | Serve compressed as attachment |

## Feature Build Log

### Phase 1 — Core compression app
- Drag-and-drop upload zone with XHR progress events
- Pillow JPEG (quality 72, progressive) and PNG (optimize, compress_level 9)
- Before/After comparison cards
- Stats bar: original size → compressed size, % reduction
- Download button

### Phase 2 — Advanced controls
- **Quality slider** (1–100): maps to JPEG quality, WEBP quality, and PNG compress_level
- **Output format picker** (JPG / PNG / WEBP): old compressed file cleaned up on format change
- **Resize — percentage** (10–200%): proportional scale via LANCZOS
- **Resize — custom W×H**: dimension inputs with aspect-ratio lock (one field drives the other)
- **Brightness / Contrast / Sharpness** (0.1–3.0): `PIL.ImageEnhance`
- **Gaussian blur** (0–20 radius): `PIL.ImageFilter.GaussianBlur`
- Auto-apply: 800 ms debounce after any control change
- Preview loading overlay on compressed image while `/process` runs
- Reset button to restore all controls to defaults

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Store original on first upload, re-process on demand | Avoids re-uploading on every settings change; keeps UX snappy |
| `/process` cleans up old `{id}_comp.*` before writing | Format change (jpg→webp) would leave orphan files otherwise |
| XHR instead of fetch for initial upload | Gives real upload progress events; fetch Streams API is less widely supported |
| 800 ms debounce for auto-apply | Prevents server spam while user drags sliders |
| LANCZOS resampling | Best quality for downscaling; acceptable cost for this use case |
| PNG quality slider → compress_level mapping | `compress_level = 9 − int(quality/12)` gives intuitive high-quality = low-compression behaviour |

## Running Locally

```bash
cd ~/image-compressor
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```
