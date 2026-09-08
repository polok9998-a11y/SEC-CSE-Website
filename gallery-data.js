// ============================================================
// GALLERY DATA — STATIC, GitHub Pages friendly
// ============================================================
// The photo Gallery is now 100% static. There is NO Firebase
// Storage and NO Firestore anywhere in this file (or the Gallery):
//
//     Cloudinary  = hosts the actual image files (gallery-upload.js)
//     this file  = the list of Gallery items (image URLs + metadata)
//     GitHub repo = where this file is committed
//     GitHub Pages = where the website is served from
//
// The public Gallery page (gallery.html) renders the GALLERY_DATA
// array below through script.js. To change what the site shows:
//
//   1. Open admin.html and sign in.
//   2. Use "Gallery Management" to upload/paste, edit or delete photos.
//   3. Use the "Publish to GitHub" card to Generate / Copy / Download the
//      updated gallery-data.js content.
//   4. Replace this file's data block with the generated one, commit and
//      push to the repository. GitHub Pages shows the changes within a
//      minute or two.
//
// Do NOT edit this data block by hand unless you know what you are
// doing — admin.html generates it for you. Every entry has:
//
//   id        (string)           - unique, stable identifier
//   imageUrl  (string, required) - direct HTTPS image link (Cloudinary)
//   title     (string)           - shown as the tile caption / lightbox title
//   caption   (string)           - optional extra description
//   category  (string)           - optional filter group (e.g. "events")
//   order     (number|null)      - display order (smaller = earlier)
// ============================================================

// ==== BEGIN GALLERY DATA ====
// Entries are added/edited/deleted from admin.html → Gallery Management.
// The block between the two markers below is replaced every time you
// click "Generate Gallery Data" in the publish card.
const GALLERY_DATA = [];
// ==== END GALLERY DATA ====

// ============================================================
// GALLERY STORE — local-only CRUD + data generation
// ============================================================
// Keeps the same public API (getStatus/getAll/add/update/remove/
// uploadFile/messageFor/onChange) that script.js already uses, but every
// operation now happens against the in-memory copy of GALLERY_DATA above.
// Nothing is written anywhere except to this page's memory — publishing
// happens by committing the generated data file to GitHub.

const GalleryStore = (() => {
  'use strict';

  // ── state ────────────────────────────────────────────────────
  let items;                              // working copy of GALLERY_DATA
  const dataProblems = [];                // invalid entries found in the data file
  const changeListeners = [];
  let started = false;

  const UPLOAD_NOT_CONFIGURED_MESSAGE =
    'Image upload is not configured yet. Open gallery-upload.js and add your ' +
    'Cloudinary cloud name and unsigned upload preset, then redeploy.';

  // ── helpers ──────────────────────────────────────────────────
  function newId() {
    return 'img-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function normalizeOrder(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const n = Number(value);
    return isFinite(n) ? n : null;
  }

  // Validates one entry from the data file. Returns a clean entry or null.
  function normalizeEntry(raw, index) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const imageUrl = typeof raw.imageUrl === 'string' ? raw.imageUrl.trim() : '';
    if (!imageUrl) return null;
    if (!/^https?:\/\//i.test(imageUrl)) return null;
    return {
      id: (typeof raw.id === 'string' && raw.id.trim()) ? raw.id.trim() : newId(),
      imageUrl: imageUrl,
      title: typeof raw.title === 'string' ? raw.title.trim() : '',
      caption: typeof raw.caption === 'string' ? raw.caption.trim() : '',
      category: typeof raw.category === 'string' ? raw.category.trim().toLowerCase() : '',
      order: normalizeOrder(raw.order)
    };
  }

  // Scans the GALLERY_DATA literal once at startup; keeps only valid
  // entries and records a helpful warning for anything it skipped.
  function scanInitialData() {
    const seen = new Set();
    const valid = [];
    GALLERY_DATA.forEach((raw, i) => {
      const entry = normalizeEntry(raw, i);
      if (!entry) {
        dataProblems.push('Entry #' + (i + 1) + ' skipped — imageUrl must be a valid http(s) URL. ' +
          (raw && raw.imageUrl ? 'Found: "' + String(raw.imageUrl).slice(0, 60) + '"' : 'none given.'));
        return;
      }
      if (seen.has(entry.id)) {
        const previousId = entry.id;
        entry.id = newId();
        console.warn('[Gallery] Entry #' + (i + 1) + ' had a duplicated id ("' + previousId + '") and was assigned a new one (' + entry.id + ').');
      }
      seen.add(entry.id);
      valid.push(entry);
    });
    items = valid;
  }

  function emitChange() {
    changeListeners.forEach(fn => fn());
    document.dispatchEvent(new CustomEvent('gallery:changed'));
  }

  // Display order: by "order" ascending (missing goes last),
  // ties broken alphabetically by id for stability.
  function sortByOrder(list) {
    const MISSING = Number.MAX_SAFE_INTEGER;
    return list.slice().sort((a, b) => {
      const ao = a.order === null ? MISSING : a.order;
      const bo = b.order === null ? MISSING : b.order;
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function requireHost() {
    const host = window.GalleryUpload;
    if (!host || typeof host.uploadFile !== 'function') return null;
    return host;
  }

  function cleanChanges(changes) {
    const clean = {};
    if ('imageUrl' in changes) clean.imageUrl = String(changes.imageUrl || '').trim();
    if ('title' in changes) clean.title = String(changes.title || '').trim();
    if ('caption' in changes) clean.caption = String(changes.caption || '').trim();
    if ('category' in changes) clean.category = String(changes.category || '').trim().toLowerCase();
    if ('order' in changes) clean.order = normalizeOrder(changes.order);
    return clean;
  }

  function friendly(err) {
    if (!err) return 'The gallery action could not be completed. Please try again.';
    const code = err.code || err.message || '';
    if (code === 'UPLOAD_NOT_CONFIGURED') return UPLOAD_NOT_CONFIGURED_MESSAGE;
    if (code === 'IMAGE_URL_REQUIRED') return 'Please enter a valid image URL.';
    if (code === 'INVALID_IMAGE' || (typeof err.message === 'string' && err.message.indexOf('Please select an image') !== -1)) {
      return 'Please select an image file (JPEG, PNG, GIF, WebP).';
    }
    if (code === 'IMAGE_TOO_LARGE' || (typeof err.message === 'string' && err.message.indexOf('must be under') !== -1)) {
      const host = requireHost();
      return 'Image must be under ' + (host && host.maxSizeMB ? host.maxSizeMB : 10) + ' MB.';
    }
    if (code === 'HOST_UNREACHABLE') return 'Could not reach the image hosting service. Check your internet connection and try again.';
    if (code === 'HOST_UPLOAD_FAILED') {
      return typeof err.message === 'string' && err.message.indexOf('rejected') !== -1
        ? err.message
        : 'The image hosting service rejected the upload. Check that the upload preset is "Unsigned", the image format is allowed, and your connection is working.';
    }
    if (code === 'NO_GALLERY_ITEM') return 'That gallery item no longer exists in the local gallery data.';
    return 'The gallery action could not be completed (' + code + '). Check the browser console for details.';
  }

  // ── formatters for the generated data file ───────────────────
  function formatEntry(entry) {
    return '  {\n' +
      '    id: ' + JSON.stringify(String(entry.id)) + ',\n' +
      '    imageUrl: ' + JSON.stringify(entry.imageUrl) + ',\n' +
      '    title: ' + JSON.stringify(entry.title) + ',\n' +
      '    caption: ' + JSON.stringify(entry.caption) + ',\n' +
      '    category: ' + JSON.stringify(entry.category) + ',\n' +
      '    order: ' + (entry.order === null || entry.order === undefined ? 'null' : entry.order) + '\n' +
      '  }';
  }

  // The exact data block that must replace the block between the
  // BEGIN/END GALLERY DATA markers in gallery-data.js.
  function generateDataBlock() {
    const entries = sortByOrder(items).map(formatEntry).join(',\n');
    return '// ==== BEGIN GALLERY DATA ====\n' +
      'const GALLERY_DATA = [\n' +
      (entries ? entries + '\n' : '') +
      '];\n' +
      '// ==== END GALLERY DATA ====';
  }

  // Preferred: rebuild the WHOLE gallery-data.js file by swapping just the
  // data block in the file currently served. Falls back to the data block
  // alone when the file cannot be fetched (e.g. file:// protocol).
  function buildUpdatedFileSource() {
    const block = this.generateDataBlock();
    return fetch('gallery-data.js', { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.text(); })
      .then(function (code) {
        const startMark = '// ==== BEGIN GALLERY DATA ====';
        const endMark = '// ==== END GALLERY DATA ====';
        const start = code.indexOf(startMark);
        const end = code.indexOf(endMark);
        if (start !== -1 && end !== -1) {
          const endPos = end + endMark.length;
          return code.slice(0, start) + block + code.slice(endPos);
        }
        return '// ============================================================\n' +
          '// gallery-data.js — regenerated block\n' +
          '// The BEGIN/END GALLERY DATA markers were not found in the current\n' +
          '// file, so this is the full new data block. Replace the old\n' +
          '// GALLERY_DATA declaration with the block below.\n' +
          '// ============================================================\n\n' + block;
      })
      .catch(function () {
        return '// Could not read the current gallery-data.js (this needs the site to be\n' +
          '// served over HTTP, e.g. GitHub Pages or a local server).\n' +
          '// Replace the GALLERY_DATA block in gallery-data.js with this one and commit.\n\n' + block;
      });
  }

  // ── public API ──────────────────────────────────────────────
  const store = {

    // Static data source: always instantly ready (no network).
    ready() { return Promise.resolve(); },

    getStatus() { return 'ready'; },

    // Human-readable notes about invalid entries found in the data file.
    getDataProblems() { return dataProblems.slice(); },

    // All images in display order.
    getAll() { return sortByOrder(items); },

    // Add an image (paste-URL path). Returns a Promise resolving with the saved record.
    add(data) {
      if (!started) return Promise.reject(new Error('The gallery is not initialised yet.'));
      const entry = normalizeEntry(Object.assign({}, data, { id: newId() }));
      if (!entry) return Promise.reject(new Error('IMAGE_URL_REQUIRED'));
      items.push(entry);
      emitChange();
      return Promise.resolve(entry);
    },

    // Update metadata of an existing item by id. Returns a Promise.
    update(id, changes) {
      if (!started) return Promise.reject(new Error('The gallery is not initialised yet.'));
      const index = items.findIndex(p => p.id === String(id));
      if (index === -1) return Promise.reject(new Error('NO_GALLERY_ITEM'));
      const current = items[index];
      const clean = cleanChanges(changes);
      if ('imageUrl' in clean) {
        if (!clean.imageUrl || !/^https?:\/\//i.test(clean.imageUrl)) return Promise.reject(new Error('IMAGE_URL_REQUIRED'));
      }
      const updated = Object.assign({}, current, clean, { id: current.id });
      items[index] = updated;
      emitChange();
      return Promise.resolve(updated);
    },

    // Remove an item by id. Returns a Promise.
    // The Cloudinary-hosted file cannot be removed from a static page (its
    // delete API needs the API secret), so it may stay in the Cloudinary
    // account — it is simply no longer referenced by the Gallery.
    remove(id) {
      if (!started) return Promise.reject(new Error('The gallery is not initialised yet.'));
      const before = items.length;
      items = items.filter(p => p.id !== String(id));
      if (items.length === before) return Promise.reject(new Error('NO_GALLERY_ITEM'));
      emitChange();
      return Promise.resolve();
    },

    // Upload an image file to Cloudinary (gallery-upload.js) and add the
    // returned HTTPS URL + metadata to the local gallery data. Returns a
    // Promise resolving with the saved record. No Firebase involved.
    uploadFile(file, metadata, onProgress) {
      if (!started) return Promise.reject(new Error('The gallery is not initialised yet.'));
      const host = requireHost();
      if (!host) return Promise.reject(new Error('UPLOAD_NOT_CONFIGURED'));
      return host.uploadFile(file, onProgress).then(result => {
        if (!result || !result.publicUrl) throw new Error('IMAGE_URL_REQUIRED');
        return store.add(Object.assign({}, metadata || {}, { imageUrl: result.publicUrl }));
      }).catch(err => {
        console.error('[Gallery] Upload FAILED — code:', err && err.code, '| message:', err && err.message);
        throw err;
      });
    },

    // Human-friendly message for a rejected CRUD promise.
    messageFor(err) { return friendly(err); },

    // Re-render callback: fires after every local change in this page.
    onChange(fn) {
      changeListeners.push(fn);
    },

    // Number of images currently in the working data.
    count() { return items.length; },

    // Exact data block (usable on its own for copy/paste).
    generateDataBlock,

    // Full updated gallery-data.js file content (uses the file currently served).
    buildUpdatedFileSource
  };

  if (!started) {
    started = true;
    scanInitialData();
    if (dataProblems.length) {
      console.warn('[Gallery] ' + dataProblems.length + ' invalid entr' + (dataProblems.length === 1 ? 'y was' : 'ies were') + ' found in GALLERY_DATA and skipped:');
      dataProblems.forEach(p => console.warn('[Gallery]   - ' + p));
    }
  }

  // Expose globally (a top-level "const" alone would not create
  // window.GalleryStore, which script.js checks for).
  window.GalleryStore = store;

  return store;
})();