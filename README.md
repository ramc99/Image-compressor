# ImageShrink — Image Compression & Enhancement Tool

A clean, fast Flask web app to compress, resize, and enhance JPG and PNG images — entirely in your browser, no data leaves your machine.

![Python](https://img.shields.io/badge/Python-3.8+-blue?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.0+-black?logo=flask)
![Pillow](https://img.shields.io/badge/Pillow-9.0+-green)
![License](https://img.shields.io/badge/License-MIT-purple)

---

## Features

- **Drag-and-drop upload** — drop a JPG or PNG directly onto the page
- **Quality control** — slider from 1 to 100 for fine-grained compression
- **Output format** — convert to JPG, PNG, or WEBP on the fly
- **Resize** — scale by percentage (10–200 %) or enter exact pixel dimensions with an aspect-ratio lock
- **Image adjustments** — brightness, contrast, sharpness, and Gaussian blur
- **Live preview** — auto-applies settings 800 ms after any change, with a loading overlay
- **Before / After comparison** — side-by-side orignal and output with file sizes
- **One-click download** — saves the processed image as `compressed.{ext}`
- **25 MB upload limit** — validated on both client and server

---

## Screenshots

| Upload | Results & Controls |
|--------|--------------------|
| ![Upload screen](https://placehold.co/460x280?text=Upload+Screen) | ![Results screen](https://placehold.co/460x280?text=Results+%26+Controls) |

---

## Getting Started

### Prerequisites

- Python 3.8 or higher
- pip

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/ramc99/Image-compressor.git
cd Image-compressor

# 2. (Optional) create a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python app.py
```

Open **http://localhost:5000** in your browser.

---

## Usage

1. **Drop** an image onto the upload zone or click **Browse files**
2. Click **Compress Image** — the result appears instantly with default settings
3. Tweak the controls on the left panel:
   - Drag the **Quality** slider
   - Pick an **Output Format** (JPG / PNG / WEBP)
   - Choose a **Resize** mode and set dimensions
   - Adjust **Brightness**, **Contrast**, **Sharpness**, or **Blur**
4. Settings apply automatically after 800 ms, or hit **Apply Settings** immediately
5. Click **Download** to save the processed file

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Serve the UI |
| `POST` | `/upload` | Accept image file, save original, return `file_id` and initial compressed result |
| `POST` | `/process` | Re-process stored original with JSON settings, return new compressed result |
| `GET`  | `/image/original/<filename>` | Serve original image for preview |
| `GET`  | `/image/compressed/<filename>` | Serve compressed image for preview |
| `GET`  | `/download/<filename>` | Download compressed image as attachment |

### `/process` payload

```json
{
  "file_id":        "58fc2628d0e7",
  "quality":        75,
  "format":         "webp",
  "resize_mode":    "percentage",
  "resize_percent": 80,
  "resize_width":   null,
  "resize_height":  null,
  "lock_aspect":    true,
  "brightness":     1.2,
  "contrast":       1.1,
  "sharpness":      1.5,
  "blur":           0
}
```

---

## Project Structure

```
Image-compressor/
├── app.py              # Flask routes + Pillow processing pipeline
├── requirements.txt
├── templates/
│   └── index.html      # Single-page UI
├── static/
│   ├── style.css       # Custom design system (CSS variables, responsive grid)
│   └── script.js       # Drag-and-drop, XHR upload, debounced auto-apply
├── SESSION_NOTES.md    # Architecture decisions and feature log
└── ERROR_LOG.md        # Known issues and resolutions
```

> `uploads/` and `compressed/` are created at runtime and excluded from version control.

---

## Configuration

All limits are set as constants at the top of `app.py`:

| Constant | Default | Description |
|----------|---------|-------------|
| `MAX_FILE_SIZE` | `25 * 1024 * 1024` | Maximum upload size (bytes) |
| `ALLOWED_EXTENSIONS` | `jpg, jpeg, png` | Accepted input formats |

---

## Built with Claude Code

This project was generated entirely using [Claude Code](https://claude.ai/code) (Anthropic) via two prompts.

### Prompt 1 — Initial app

> Build a clean and visually appealing Flask web application for image size reduction.
>
> **Requirements:**
>
> 1. **Tech stack:** Backend: Python Flask · Frontend: HTML, CSS (modern styling, centered layout, responsive design)
>
> 2. **Features:**
>    - Upload an image file (max size: 25MB)
>    - Accept formats: JPG, JPEG, PNG
>    - After upload, compress the image automatically
>    - Reduce file size using efficient compression (adjust quality or optimize)
>    - Show: Original file size · Compressed file size · Preview of original and compressed images
>
> 3. **Functionality:**
>    - Use Python image processing library like Pillow
>    - Save compressed image temporarily
>    - Provide a download button for the compressed image
>
> 4. **UI Requirements:**
>    - Clean card layout
>    - Drag-and-drop upload area
>    - Progress/loading indicator
>    - Before vs After comparison section
>
> 5. **Constraints:**
>    - Reject files larger than 25MB
>    - Handle invalid file types gracefully

### Prompt 2 — Advanced controls

> Enhance the existing Flask image compression app with advanced image controls.
>
> **Add the following features:**
>
> 1. **User Controls:** Compression quality slider (1–100) · Resize option (percentage or custom width/height) · Output format selection (JPG, PNG, WEBP)
>
> 2. **Image Adjustments:** Brightness control · Contrast control · Sharpness control · Blur effect (Gaussian blur slider)
>
> 3. **Preview:** Real-time preview (or quick refresh preview after applying settings)
>
> 4. **Backend:** Use Pillow for all transformations · Apply transformations before saving compressed image
>
> 5. **UI Enhancements:** Sliders with labels · Toggle for advanced settings · Side-by-side comparison
>
> 6. **Maintain:** 25MB upload limit · Error handling · Clean UX

---

## License

MIT — do whatever you like with it.
