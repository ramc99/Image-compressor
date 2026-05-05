/* ── Upload section refs ───────────────────────────────────── */
const dropZone       = document.getElementById('dropZone');
const browseLink     = document.getElementById('browseLink');
const fileInput      = document.getElementById('fileInput');
const selectedFile   = document.getElementById('selectedFile');
const thumbImg       = document.getElementById('thumbImg');
const fileName       = document.getElementById('fileName');
const fileSize       = document.getElementById('fileSize');
const removeBtn      = document.getElementById('removeBtn');
const compressBtn    = document.getElementById('compressBtn');

/* ── Section refs ──────────────────────────────────────────── */
const uploadSection  = document.getElementById('uploadSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');
const progressFill   = document.getElementById('progressFill');
const loadingText    = document.getElementById('loadingText');

/* ── Stats refs ────────────────────────────────────────────── */
const statOriginal   = document.getElementById('statOriginal');
const statCompressed = document.getElementById('statCompressed');
const statBadge      = document.getElementById('statBadge');
const statOrigDim    = document.getElementById('statOrigDim');
const statOutDim     = document.getElementById('statOutDim');

/* ── Comparison refs ───────────────────────────────────────── */
const imgOriginal      = document.getElementById('imgOriginal');
const imgCompressed    = document.getElementById('imgCompressed');
const footOriginal     = document.getElementById('footOriginal');
const footCompressed   = document.getElementById('footCompressed');
const previewOverlay   = document.getElementById('previewOverlay');

/* ── Action refs ───────────────────────────────────────────── */
const downloadBtn    = document.getElementById('downloadBtn');
const newBtn         = document.getElementById('newBtn');

/* ── Controls refs ─────────────────────────────────────────── */
const qualitySlider  = document.getElementById('quality');
const qualityVal     = document.getElementById('qualityVal');
const formatPicker   = document.getElementById('formatPicker');
const resizeModeRadios = document.querySelectorAll('input[name="resizeMode"]');
const resizePctPanel = document.getElementById('resizePctPanel');
const resizeCustomPanel = document.getElementById('resizeCustomPanel');
const resizePctSlider = document.getElementById('resizePctSlider');
const resizePctVal   = document.getElementById('resizePctVal');
const resizeW        = document.getElementById('resizeW');
const resizeH        = document.getElementById('resizeH');
const lockBtn        = document.getElementById('lockBtn');
const lockIcon       = document.getElementById('lockIcon');
const brightnessSlider = document.getElementById('brightness');
const brightnessVal  = document.getElementById('brightnessVal');
const contrastSlider = document.getElementById('contrast');
const contrastVal    = document.getElementById('contrastVal');
const sharpnessSlider = document.getElementById('sharpness');
const sharpnessVal   = document.getElementById('sharpnessVal');
const blurSlider     = document.getElementById('blur');
const blurVal        = document.getElementById('blurVal');
const applyBtn       = document.getElementById('applyBtn');
const resetControls  = document.getElementById('resetControls');

/* ── Toast refs ────────────────────────────────────────────── */
const errorToast     = document.getElementById('errorToast');
const toastMsg       = document.getElementById('toastMsg');
const toastClose     = document.getElementById('toastClose');

/* ── State ─────────────────────────────────────────────────── */
const MAX_BYTES    = 25 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);

let pendingFile    = null;
let currentFileId  = null;
let origDimensions = { w: 0, h: 0 };
let lockAspect     = true;
let applyTimer     = null;
let isApplying     = false;

/* ════════════════════════════════════════════════════════════
   DRAG-AND-DROP / FILE PICKER
═══════════════════════════════════════════════════════════ */
dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
dropZone.addEventListener('click', (e) => {
    if (removeBtn.contains(e.target)) return;
    fileInput.click();
});
browseLink.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

function handleFile(file) {
    if (!ALLOWED_MIME.has(file.type)) {
        showError('Invalid file type. Please upload a JPG or PNG image.');
        return;
    }
    if (file.size > MAX_BYTES) {
        showError('File is too large. Maximum allowed size is 25 MB.');
        return;
    }
    hideError();
    pendingFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { thumbImg.src = e.target.result; };
    reader.readAsDataURL(file);
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    selectedFile.classList.remove('hidden');
    compressBtn.disabled = false;
}

removeBtn.addEventListener('click', (e) => { e.stopPropagation(); resetUpload(); });

function resetUpload() {
    pendingFile = null;
    fileInput.value = '';
    thumbImg.src = '';
    selectedFile.classList.add('hidden');
    compressBtn.disabled = true;
}

/* ════════════════════════════════════════════════════════════
   INITIAL UPLOAD
═══════════════════════════════════════════════════════════ */
compressBtn.addEventListener('click', startUpload);

function startUpload() {
    if (!pendingFile) return;
    const formData = new FormData();
    formData.append('file', pendingFile);

    show(loadingSection); hide(uploadSection); hide(resultsSection);
    setProgress(0);
    loadingText.textContent = 'Uploading…';

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setProgress((e.loaded / e.total) * 78);
    });
    xhr.upload.addEventListener('load', () => { setProgress(82); loadingText.textContent = 'Compressing…'; });
    xhr.addEventListener('load', () => {
        setProgress(100);
        let data;
        try { data = JSON.parse(xhr.responseText); } catch {
            onUploadError('Unexpected server response.'); return;
        }
        if (xhr.status !== 200 || data.error) { onUploadError(data.error || 'Upload failed.'); return; }
        setTimeout(() => { hide(loadingSection); initResults(data); }, 320);
    });
    xhr.addEventListener('error', () => onUploadError('Network error. Please try again.'));
    xhr.open('POST', '/upload');
    xhr.send(formData);
}

function onUploadError(msg) {
    hide(loadingSection); show(uploadSection); showError(msg); setProgress(0);
}

/* ════════════════════════════════════════════════════════════
   SHOW INITIAL RESULTS + SEED CONTROLS
═══════════════════════════════════════════════════════════ */
function initResults(data) {
    currentFileId     = data.file_id;
    origDimensions    = { w: data.orig_width, h: data.orig_height };

    // Stats
    statOriginal.textContent    = data.original_size_str;
    statOrigDim.textContent     = `${data.orig_width} × ${data.orig_height}`;
    updateCompressedStats(data.compressed_size_str, data.reduction_percent,
                          data.orig_width, data.orig_height);

    // Images
    imgOriginal.src   = data.original_url;
    imgCompressed.src = data.compressed_url + '?t=' + Date.now();
    footOriginal.textContent  = `${data.original_size_str} · ${data.orig_width}×${data.orig_height}`;
    footCompressed.textContent = data.compressed_size_str;

    // Download
    downloadBtn.href  = `/download/${data.download_id}`;

    // Seed format picker to match original extension
    const ext = data.orig_ext === 'jpeg' ? 'jpg' : data.orig_ext;
    setActiveFormat(ext);

    // Seed quality to default
    qualitySlider.value = 72;
    qualityVal.textContent = 72;

    // Seed resize custom with original dims
    resizeW.value = '';
    resizeH.value = '';

    show(resultsSection);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateCompressedStats(sizeStr, reductionPct, w, h) {
    statCompressed.textContent = sizeStr;
    statOutDim.textContent     = w && h ? `${w} × ${h}` : '';
    const sign = reductionPct >= 0 ? '-' : '+';
    statBadge.textContent = `${sign}${Math.abs(reductionPct)}% size`;
    statBadge.style.background = reductionPct >= 0
        ? 'var(--success-light)' : 'var(--danger-light)';
    statBadge.style.color = reductionPct >= 0
        ? 'var(--success-dark)' : 'var(--danger)';
}

/* ════════════════════════════════════════════════════════════
   CONTROLS — WIRE UP EVENTS
═══════════════════════════════════════════════════════════ */

// Quality
qualitySlider.addEventListener('input', () => {
    qualityVal.textContent = qualitySlider.value;
    scheduleApply();
});

// Format picker
formatPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('.fmt-btn');
    if (!btn) return;
    setActiveFormat(btn.dataset.fmt);
    scheduleApply();
});

function setActiveFormat(fmt) {
    formatPicker.querySelectorAll('.fmt-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.fmt === fmt);
    });
}

function getActiveFormat() {
    return formatPicker.querySelector('.fmt-btn.active')?.dataset.fmt || 'jpg';
}

// Resize mode
resizeModeRadios.forEach(r => r.addEventListener('change', () => {
    const mode = getResizeMode();
    resizePctPanel.classList.toggle('hidden', mode !== 'percentage');
    resizeCustomPanel.classList.toggle('hidden', mode !== 'custom');
    scheduleApply();
}));

function getResizeMode() {
    return [...resizeModeRadios].find(r => r.checked)?.value || 'none';
}

// Resize % slider
resizePctSlider.addEventListener('input', () => {
    resizePctVal.textContent = resizePctSlider.value + '%';
    scheduleApply();
});

// Custom resize with aspect-ratio lock
lockBtn.addEventListener('click', () => {
    lockAspect = !lockAspect;
    lockBtn.classList.toggle('locked', lockAspect);
    // swap icon path: locked = padlock closed, unlocked = padlock open
    lockIcon.querySelector('path').setAttribute('d', lockAspect
        ? 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
        : 'M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z');
});
// Initialise locked state visually
lockBtn.classList.add('locked');

resizeW.addEventListener('input', () => {
    if (lockAspect && origDimensions.w && resizeW.value) {
        const rw = parseInt(resizeW.value, 10);
        if (rw > 0) resizeH.value = Math.round(origDimensions.h * rw / origDimensions.w);
    }
    scheduleApply();
});
resizeH.addEventListener('input', () => {
    if (lockAspect && origDimensions.h && resizeH.value) {
        const rh = parseInt(resizeH.value, 10);
        if (rh > 0) resizeW.value = Math.round(origDimensions.w * rh / origDimensions.h);
    }
    scheduleApply();
});

// Adjustment sliders
function wireSlider(slider, valEl, decimals = 1) {
    slider.addEventListener('input', () => {
        valEl.textContent = parseFloat(slider.value).toFixed(decimals);
        scheduleApply();
    });
}
wireSlider(brightnessSlider, brightnessVal);
wireSlider(contrastSlider,   contrastVal);
wireSlider(sharpnessSlider,  sharpnessVal);
wireSlider(blurSlider,       blurVal, 1);

// Apply & Reset buttons
applyBtn.addEventListener('click', () => { clearTimeout(applyTimer); applySettings(); });

resetControls.addEventListener('click', () => {
    qualitySlider.value    = 72; qualityVal.textContent = 72;
    brightnessSlider.value = 1;  brightnessVal.textContent = '1.0';
    contrastSlider.value   = 1;  contrastVal.textContent  = '1.0';
    sharpnessSlider.value  = 1;  sharpnessVal.textContent = '1.0';
    blurSlider.value       = 0;  blurVal.textContent      = '0';
    resizePctSlider.value  = 100; resizePctVal.textContent = '100%';
    resizeW.value = ''; resizeH.value = '';
    document.querySelector('input[name="resizeMode"][value="none"]').checked = true;
    resizePctPanel.classList.add('hidden');
    resizeCustomPanel.classList.add('hidden');
    const origExt = imgOriginal.src.split('_orig.')[1]?.split('?')[0] || 'jpg';
    setActiveFormat(origExt === 'jpeg' ? 'jpg' : origExt);
    scheduleApply();
});

/* ════════════════════════════════════════════════════════════
   APPLY SETTINGS  (POST /process)
═══════════════════════════════════════════════════════════ */
function scheduleApply() {
    if (!currentFileId) return;
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applySettings, 800);
}

async function applySettings() {
    if (!currentFileId || isApplying) return;
    isApplying = true;

    show(previewOverlay);
    applyBtn.disabled = true;

    const settings = collectSettings();

    try {
        const res  = await fetch('/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
            showError(data.error || 'Processing failed.');
            return;
        }

        // Update compressed preview (cache-bust)
        imgCompressed.src = data.compressed_url + '?t=' + Date.now();
        footCompressed.textContent =
            `${data.compressed_size_str} · ${data.output_width}×${data.output_height}`;
        updateCompressedStats(data.compressed_size_str, data.reduction_percent,
                              data.output_width, data.output_height);
        downloadBtn.href = `/download/${data.download_id}`;
        hideError();

    } catch {
        showError('Network error. Please try again.');
    } finally {
        isApplying = false;
        hide(previewOverlay);
        applyBtn.disabled = false;
    }
}

function collectSettings() {
    const mode = getResizeMode();
    return {
        file_id:        currentFileId,
        quality:        parseInt(qualitySlider.value, 10),
        format:         getActiveFormat(),
        resize_mode:    mode,
        resize_percent: mode === 'percentage' ? parseInt(resizePctSlider.value, 10) : 100,
        resize_width:   mode === 'custom' && resizeW.value ? parseInt(resizeW.value, 10) : null,
        resize_height:  mode === 'custom' && resizeH.value ? parseInt(resizeH.value, 10) : null,
        lock_aspect:    lockAspect,
        brightness:     parseFloat(brightnessSlider.value),
        contrast:       parseFloat(contrastSlider.value),
        sharpness:      parseFloat(sharpnessSlider.value),
        blur:           parseFloat(blurSlider.value),
    };
}

/* ════════════════════════════════════════════════════════════
   NEW UPLOAD / RESET
═══════════════════════════════════════════════════════════ */
newBtn.addEventListener('click', () => {
    currentFileId = null;
    hide(resultsSection);
    show(uploadSection);
    resetUpload();
    uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ════════════════════════════════════════════════════════════
   TOAST ERROR
═══════════════════════════════════════════════════════════ */
function showError(msg) { toastMsg.textContent = msg; errorToast.classList.add('visible'); }
function hideError()    { errorToast.classList.remove('visible'); }
toastClose.addEventListener('click', hideError);

/* ════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }
function setProgress(pct) { progressFill.style.width = `${Math.min(100, pct)}%`; }

function formatBytes(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}
