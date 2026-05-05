import os
import glob
import uuid
from flask import Flask, render_template, request, jsonify, send_file, abort
from PIL import Image, ImageEnhance, ImageFilter

app = Flask(__name__)

BASE_DIR         = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER    = os.path.join(BASE_DIR, 'uploads')
COMPRESSED_FOLDER = os.path.join(BASE_DIR, 'compressed')
MAX_FILE_SIZE    = 25 * 1024 * 1024
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(COMPRESSED_FOLDER, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def format_bytes(size):
    for unit in ['B', 'KB', 'MB']:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} GB"


def process_image(input_path, output_path, settings):
    quality      = max(1, min(100, int(settings.get('quality', 72))))
    out_fmt      = settings.get('format', 'jpg').lower()
    resize_mode  = settings.get('resize_mode', 'none')
    brightness   = float(settings.get('brightness', 1.0))
    contrast     = float(settings.get('contrast', 1.0))
    sharpness    = float(settings.get('sharpness', 1.0))
    blur         = float(settings.get('blur', 0.0))

    with Image.open(input_path) as img:
        orig_w, orig_h = img.size

        # ── Resize ──────────────────────────────────────────────
        if resize_mode == 'percentage':
            pct   = max(1, min(200, float(settings.get('resize_percent', 100)))) / 100
            new_w = max(1, int(orig_w * pct))
            new_h = max(1, int(orig_h * pct))
            img   = img.resize((new_w, new_h), Image.LANCZOS)

        elif resize_mode == 'custom':
            raw_w  = settings.get('resize_width')
            raw_h  = settings.get('resize_height')
            locked = settings.get('lock_aspect', True)
            if raw_w and raw_h:
                img = img.resize((int(raw_w), int(raw_h)), Image.LANCZOS)
            elif raw_w:
                rw = max(1, int(raw_w))
                rh = max(1, int(orig_h * rw / orig_w)) if locked else orig_h
                img = img.resize((rw, rh), Image.LANCZOS)
            elif raw_h:
                rh = max(1, int(raw_h))
                rw = max(1, int(orig_w * rh / orig_h)) if locked else orig_w
                img = img.resize((rw, rh), Image.LANCZOS)

        # ── Colour mode for target format ────────────────────────
        if out_fmt in ('jpg', 'jpeg'):
            if img.mode != 'RGB':
                img = img.convert('RGB')
        elif out_fmt == 'webp':
            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGB')
        # PNG: leave mode as-is

        # ── Adjustments ──────────────────────────────────────────
        if brightness != 1.0:
            img = ImageEnhance.Brightness(img).enhance(brightness)
        if contrast != 1.0:
            img = ImageEnhance.Contrast(img).enhance(contrast)
        if sharpness != 1.0:
            img = ImageEnhance.Sharpness(img).enhance(sharpness)
        if blur > 0:
            img = img.filter(ImageFilter.GaussianBlur(radius=blur))

        # ── Save ─────────────────────────────────────────────────
        pil_fmt_map = {'jpg': 'JPEG', 'jpeg': 'JPEG', 'png': 'PNG', 'webp': 'WEBP'}
        pil_fmt = pil_fmt_map.get(out_fmt, 'JPEG')

        if pil_fmt == 'JPEG':
            img.save(output_path, 'JPEG', quality=quality, optimize=True, progressive=True)
        elif pil_fmt == 'PNG':
            compress_level = max(0, min(9, 9 - int(quality / 12)))
            img.save(output_path, 'PNG', optimize=True, compress_level=compress_level)
        else:
            img.save(output_path, 'WEBP', quality=quality, method=4)

        return img.size  # (width, height) after all transforms


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only JPG, JPEG, and PNG are supported.'}), 400

    file.seek(0, os.SEEK_END)
    if file.tell() > MAX_FILE_SIZE:
        return jsonify({'error': 'File exceeds the 25 MB size limit.'}), 400
    file.seek(0)

    ext     = file.filename.rsplit('.', 1)[1].lower()
    file_id = uuid.uuid4().hex[:12]

    orig_filename = f"{file_id}_orig.{ext}"
    comp_filename = f"{file_id}_comp.{ext}"
    orig_path = os.path.join(UPLOAD_FOLDER, orig_filename)
    comp_path = os.path.join(COMPRESSED_FOLDER, comp_filename)

    file.save(orig_path)
    orig_size = os.path.getsize(orig_path)

    with Image.open(orig_path) as img:
        orig_w, orig_h = img.size

    defaults = {'quality': 72, 'format': ext, 'resize_mode': 'none',
                'brightness': 1.0, 'contrast': 1.0, 'sharpness': 1.0, 'blur': 0}
    try:
        process_image(orig_path, comp_path, defaults)
    except Exception as e:
        os.remove(orig_path)
        return jsonify({'error': f'Image processing failed: {str(e)}'}), 500

    comp_size = os.path.getsize(comp_path)
    reduction = (orig_size - comp_size) / orig_size * 100 if orig_size else 0

    return jsonify({
        'file_id':            file_id,
        'orig_ext':           ext,
        'original_size':      orig_size,
        'compressed_size':    comp_size,
        'original_size_str':  format_bytes(orig_size),
        'compressed_size_str': format_bytes(comp_size),
        'reduction_percent':  round(reduction, 1),
        'original_url':       f'/image/original/{orig_filename}',
        'compressed_url':     f'/image/compressed/{comp_filename}',
        'download_id':        comp_filename,
        'orig_width':         orig_w,
        'orig_height':        orig_h,
    })


@app.route('/process', methods=['POST'])
def process():
    data    = request.get_json(silent=True) or {}
    file_id = data.get('file_id', '')

    matches = glob.glob(os.path.join(UPLOAD_FOLDER, f"{file_id}_orig.*"))
    if not matches:
        return jsonify({'error': 'Original file not found. Please re-upload.'}), 404
    orig_path = matches[0]

    out_fmt       = data.get('format', 'jpg').lower()
    ext           = 'jpg' if out_fmt in ('jpg', 'jpeg') else out_fmt
    comp_filename = f"{file_id}_comp.{ext}"
    comp_path     = os.path.join(COMPRESSED_FOLDER, comp_filename)

    # Remove old compressed variants (format may have changed)
    for old in glob.glob(os.path.join(COMPRESSED_FOLDER, f"{file_id}_comp.*")):
        try:
            os.remove(old)
        except OSError:
            pass

    try:
        final_w, final_h = process_image(orig_path, comp_path, data)
    except Exception as e:
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

    comp_size = os.path.getsize(comp_path)
    orig_size = os.path.getsize(orig_path)
    reduction = (orig_size - comp_size) / orig_size * 100 if orig_size else 0

    return jsonify({
        'compressed_size':     comp_size,
        'compressed_size_str': format_bytes(comp_size),
        'reduction_percent':   round(reduction, 1),
        'compressed_url':      f'/image/compressed/{comp_filename}',
        'download_id':         comp_filename,
        'output_width':        final_w,
        'output_height':       final_h,
    })


@app.route('/image/original/<filename>')
def serve_original(filename):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.isfile(path):
        abort(404)
    return send_file(path)


@app.route('/image/compressed/<filename>')
def serve_compressed(filename):
    path = os.path.join(COMPRESSED_FOLDER, filename)
    if not os.path.isfile(path):
        abort(404)
    return send_file(path)


@app.route('/download/<filename>')
def download(filename):
    path = os.path.join(COMPRESSED_FOLDER, filename)
    if not os.path.isfile(path):
        abort(404)
    ext = filename.rsplit('.', 1)[1] if '.' in filename else 'jpg'
    return send_file(path, as_attachment=True, download_name=f'compressed.{ext}')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
