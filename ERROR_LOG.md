# ImageShrink — Error Log

---

## [2026-05-05] Port 5000 already in use on first run

**Symptom**
```
Address already in use
Port 5000 is in use by another program.
```

**Cause**
Another process (likely a previous Flask dev server) was still bound to port 5000.

**Resolution**
```bash
kill $(lsof -ti :5000)
python app.py
```

**Status:** Resolved

---

## [2026-05-05] PNG size increase when blur + high quality

**Symptom**
`/process` returned `reduction_percent: -3.8` for a PNG output with blur radius 3 and quality 90.

**Cause**
Gaussian blur smooths high-frequency pixel data, which normally helps PNG compression. However,
when `compress_level` is low (mapped from high quality value), the output can be larger than the
original if the original was already well-compressed.

**Resolution**
Expected and acceptable behaviour — the stats badge switches to a red `+X% size` indicator when
the output is larger than the original, so the user is clearly informed. No code change needed.

**Status:** Resolved (by design)

---
<!-- Append new errors below this line -->
