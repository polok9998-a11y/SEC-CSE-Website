// ============================================================
// EXTERNAL IMAGE HOSTING — Cloudinary (unsigned upload preset)
// ============================================================
// The Gallery uploads each image to Cloudinary; the returned permanent HTTPS
// URL is then stored in the static gallery-data.js file (see admin.html →
// "Publish to GitHub"). There is NO Firebase Storage and NO Firestore in the
// Gallery, so no Blaze/billing plan is required.
//
// HOW THE UPLOAD STAYS SECURE WITHOUT A BACKEND
//   Cloudinary's "unsigned upload preset" is specifically designed for
//   browser-only uploads on static hosting (GitHub Pages). The ONLY two
//   values this file needs are PUBLIC by design:
//     * Cloud name      - identifies your account (like a username)
//     * Upload preset   - an unsigned preset you create in the dashboard
//   There is NO private API key/secret here. Deleting images server-side
//   requires the API secret, so deletion of the hosted file is NOT possible
//   from a static page — the image is simply removed from gallery-data.js
//   instead.
//
// ONE-TIME SETUP (free account, ~2 minutes):
//   1. Create a free account at https://cloudinary.com
//   2. Your Cloud name is on the Dashboard (left column).
//   3. Settings -> Upload -> "Add upload preset":
//        - "Save mode": Unsigned        (IMPORTANT, not "Signed")
//        - Allowed formats: jpg, png, gif, webp   (recommended)
//        - Folder (optional): e.g. "gallery"
//   4. Copy the preset NAME (shown next to the preset) and your Cloud name
//      into the CONFIG block below, then redeploy the site.
//
// The upload preset + cloud name are the same for every visitor (that is
// how Cloudinary widgets work). Anyone COULD upload to your Cloudinary quota,
// but publishing to the website requires committing the generated
// gallery-data.js to the repository, which only the site maintainers can do.
// ============================================================

const GalleryUpload = (() => {
  'use strict';

  // ── CONFIG: edit the two values below ──────────────────────
  const CONFIG = {
    cloudName: 'perisowy',
    uploadPreset: 'sec_cse_gallery',
    folder: '',            // optional; usually set inside the preset instead
    maxSizeMB: 10          // must match the preset's max file size
  };
  // ────────────────────────────────────────────────────────────

  const UPLOAD_ENDPOINT = 'https://api.cloudinary.com/v1_1/%s/image/upload';

  function isUnset(value) {
    return typeof value !== 'string' || value.trim() === '' || value.indexOf('YOUR_') === 0;
  }

  function makeErr(code, message, extra) {
    const err = new Error(message);
    err.code = code;
    if (extra) err.details = extra;
    return err;
  }

  // Returns the live config, or null when the two public values are still
  // placeholders/empty (callers should surface a "not configured" message).
  function settings() {
    if (isUnset(CONFIG.cloudName) || isUnset(CONFIG.uploadPreset)) return null;
    return {
      provider: 'cloudinary',
      providerName: 'Cloudinary',
      cloudName: CONFIG.cloudName.trim(),
      uploadPreset: CONFIG.uploadPreset.trim()
    };
  }

  function getConfigError() {
    return 'Image upload is not configured yet. Open gallery-upload.js and ' +
      'add your Cloudinary cloud name and your unsigned upload preset ' +
      '(see the setup notes at the top of that file), then redeploy.';
  }

  // Uploads a File and resolves with { publicUrl, publicId } for the new
  // permanent HTTPS image, or rejects with a descriptive Error.
  // onProgress: optional (bytesTransferred, totalBytes).
  function uploadFile(file, onProgress) {
    const cfg = settings();
    if (!cfg) {
      return Promise.reject(makeErr('UPLOAD_NOT_CONFIGURED', getConfigError()));
    }
    if (!file || !file.type || file.type.indexOf('image/') !== 0) {
      return Promise.reject(makeErr('INVALID_IMAGE',
        'Please select an image file (JPEG, PNG, GIF, WebP).'));
    }
    const maxBytes = CONFIG.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return Promise.reject(makeErr('IMAGE_TOO_LARGE',
        'Image must be under ' + CONFIG.maxSizeMB + ' MB.'));
    }

    const form = new FormData();
    form.append('file', file, file.name || 'gallery-' + Date.now() + '.jpg');
    form.append('upload_preset', cfg.uploadPreset);
    const folder = String(CONFIG.folder || '').trim();
    if (folder) form.append('folder', folder);

    console.log('[Gallery] Uploading to', cfg.providerName, '—', file.name,
      '| size:', file.size, 'bytes | type:', file.type);

    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', UPLOAD_ENDPOINT.replace('%s', cfg.cloudName));
      xhr.responseType = 'text';

      if (xhr.upload) {
        xhr.upload.addEventListener('progress', function (e) {
          if (onProgress && e.lengthComputable) {
            onProgress({ bytesTransferred: e.loaded, totalBytes: e.total });
          }
        });
      }

      xhr.addEventListener('load', function () {
        let body = null;
        try { body = JSON.parse(xhr.responseText); } catch (e) { body = null; }

        if (xhr.status >= 200 && xhr.status < 300 && body && body.secure_url) {
          console.log('[Gallery] Host upload OK — secure_url:', body.secure_url);
          if (onProgress) onProgress({ bytesTransferred: file.size, totalBytes: file.size });
          resolve({ publicUrl: body.secure_url, publicId: body.public_id || '' });
          return;
        }

        const reason = body && body.error && body.error.message
          ? String(body.error.message)
          : ('HTTP ' + xhr.status);
        console.error('[Gallery] Host upload rejected —', reason);
        reject(makeErr('HOST_UPLOAD_FAILED',
          'The image hosting service rejected the upload (' + reason + '). ' +
          'Check that the upload preset exists, is set to "Unsigned", and ' +
          'allows the chosen image format, then try again.',
          { status: xhr.status, hostError: reason }));
      });

      xhr.addEventListener('error', function () {
        console.error('[Gallery] Host unreachable — could not reach the image hosting service.');
        reject(makeErr('HOST_UNREACHABLE',
          'Could not reach the image hosting service. Check your internet connection and try again.'));
      });

      xhr.addEventListener('abort', function () {
        reject(makeErr('HOST_UPLOAD_FAILED', 'Upload was canceled.', { aborted: true }));
      });

      xhr.send(form);
    });
  }

  return {
    settings,
    uploadFile,
    providerName: 'Cloudinary',
    configError: getConfigError,
    maxSizeMB: CONFIG.maxSizeMB
  };
})();

// Expose globally (a top-level "const" alone would not create window.GalleryUpload).
window.GalleryUpload = GalleryUpload;