// ===== GALLERY STORE =====
// Single shared source of truth for the photo gallery (public Gallery page
// and the Gallery Management panel in admin.html).
//
// Mirrors NoticeStore (notices-data.js): data lives in Firebase Firestore
// (collection: "gallery"), every visitor sees the same photos, and a
// real-time listener (onSnapshot) keeps a local cache up to date.
// getAll() reads that cache; add/update/remove write through Firestore so
// security is enforced by firestore.rules on the server.
//
// Document fields:
//   imageUrl  (string, required) - direct link to the image
//   title     (string)           - shown as the tile caption / lightbox title
//   caption   (string)           - optional extra description
//   category  (string)           - optional filter group (e.g. "events")
//   order     (number|null)      - display order (smaller = earlier)
//   createdAt / updatedAt        - server timestamps
//
// This file does NOT initialise Firebase a second time — it reuses the
// single window.NoticeFirebase instance created by firebase-config.js.

const GalleryStore = (() => {
  'use strict';

  // ── state ────────────────────────────────────────────────────
  let cache = [];                 // latest snapshot from Firestore
  let status = 'loading';         // 'loading' | 'ready' | 'error'
  let unsubscribe = null;
  const changeListeners = [];
  const statusListeners = [];
  let started = false;

  let readyResolve = null;
  let readyReject = null;
  const readyPromise = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  function setStatus(next) {
    if (status === next) return;
    status = next;
    statusListeners.forEach(fn => fn(status));
  }

  function emitChange() {
    changeListeners.forEach(fn => fn());
    document.dispatchEvent(new CustomEvent('gallery:changed'));
  }

  // Firestore doc -> plain object used across the site.
  function toPlain(docSnap) {
    const d = docSnap.data() || {};
    let order = null;
    if (typeof d.order === 'number' && isFinite(d.order)) {
      order = d.order;
    } else if (typeof d.order === 'string' && d.order.trim() !== '' && !isNaN(parseInt(d.order, 10))) {
      order = parseInt(d.order, 10);
    }
    return {
      id: docSnap.id,
      imageUrl: typeof d.imageUrl === 'string' ? d.imageUrl.trim() : '',
      title: typeof d.title === 'string' ? d.title.trim() : '',
      caption: typeof d.caption === 'string' ? d.caption.trim() : '',
      category: typeof d.category === 'string' ? d.category.trim().toLowerCase() : '',
      order: order,
      storagePath: typeof d.storagePath === 'string' ? d.storagePath.trim() : '',
      createdAt: d.createdAt || null,
      updatedAt: d.updatedAt || null
    };
  }

  // Display order: by "order" ascending (missing goes last),
  // ties broken alphabetically by document id for stability.
  function sortByOrder(list) {
    const MISSING = Number.MAX_SAFE_INTEGER;
    return list.slice().sort((a, b) => {
      const ao = a.order === null ? MISSING : a.order;
      const bo = b.order === null ? MISSING : b.order;
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  // ── Firebase access ─────────────────────────────────────────
  // Same handshake as notices-data.js: firebase-config.js loads
  // asynchronously and announces itself with window.NoticeFirebase.
  function whenFirebase(timeoutMs) {
    return new Promise((resolve, reject) => {
      const fb = window.NoticeFirebase;
      if (fb && fb.ready) { resolve(fb); return; }
      if (fb && fb.ready === false) { reject(new Error(fb.error || 'Firebase is not configured.')); return; }

      let done = false;
      const ok = () => { if (!done) { done = true; cleanup(); resolve(window.NoticeFirebase); } };
      const bad = () => {
        if (done) return;
        done = true; cleanup();
        const msg = (window.NoticeFirebase && window.NoticeFirebase.error) ||
          'Could not connect to the gallery service.';
        reject(new Error(msg));
      };
      const timer = setTimeout(bad, timeoutMs || 15000);
      function cleanup() { clearTimeout(timer); }

      document.addEventListener('noticefirebase:ready', ok);
      document.addEventListener('noticefirebase:failed', bad);
    });
  }

  function start(fb) {
    if (unsubscribe) unsubscribe();
    const colRef = fb.fs.collection(fb.db, fb.GALLERY_COLLECTION);

    unsubscribe = fb.fs.onSnapshot(colRef,
      snapshot => {
        cache = snapshot.docs.map(toPlain);
        setStatus('ready');
        readyResolve();
        emitChange();            // re-render the gallery instantly (real time)
      },
      err => {
        console.warn('[Gallery] Firestore read failed:', err && err.code, err && err.message);
        cache = [];
        setStatus('error');
        readyReject(err);
        emitChange();
      }
    );
  }

  function ensureStarted() {
    if (started) return readyPromise;
    started = true;
    whenFirebase()
      .then(start)
      .catch(err => {
        console.warn('[Gallery]', err && err.message);
        setStatus('error');
        readyReject(err);
        emitChange();
      });

    // Safety net: stop showing "loading" if the SDK never answers.
    setTimeout(() => {
      if (status === 'loading') {
        setStatus('error');
        readyReject(new Error('Connection timed out.'));
        emitChange();
      }
    }, 20000);

    return readyPromise;
  }

  function requireFb() {
    const fb = window.NoticeFirebase;
    if (!fb || !fb.ready) throw new Error('FIREBASE_UNAVAILABLE');
    return fb;
  }

  function normalizeOrder(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const n = Number(value);
    return isFinite(n) ? n : null;
  }

  // Generate a unique filename for uploaded files.
  function uniqueFilename(originalName) {
    const ext = originalName.includes('.') ? originalName.split('.').pop() : 'jpg';
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    return ts + '-' + rand + '.' + ext;
  }

  // Delete a Storage file given its storagePath (best-effort, ignores errors).
  function deleteStorageFile(fb, path) {
    if (!path) return Promise.resolve();
    try {
      const fileRef = fb.st.ref(fb.storage, path);
      return fb.st.deleteObject(fileRef).catch(function () {});
    } catch (e) {
      return Promise.resolve();
    }
  }

  function friendly(err) {
    if (err && err.message === 'FIREBASE_UNAVAILABLE') {
      return 'Cannot reach the gallery service right now. Please try again later.';
    }
    if (err && err.message && err.message.indexOf('Please select an image') !== -1) {
      return err.message;
    }
    if (err && err.message && err.message.indexOf('under 10 MB') !== -1) {
      return err.message;
    }
    const code = err && err.code;
    if (code === 'permission-denied') return 'You are not allowed to do that. Sign in as the admin first.';
    if (code === 'unavailable' || code === 'network-request-failed') return 'Network problem. Check your internet connection and try again.';
    if (code === 'storage/unauthorized') return 'You are not authorized to upload files. Sign in as the admin first.';
    if (code === 'storage/canceled') return 'Upload was canceled.';
    if (code === 'storage/quota-exceeded') return 'Storage quota exceeded. Please contact support.';
    return 'Something went wrong. Please try again.';
  }

  // ── public API ──────────────────────────────────────────────
  const store = {

    // Resolves on the first successful read from Firestore.
    ready() { ensureStarted(); return readyPromise; },

    getStatus() { return status; },

    onStatusChange(fn) { statusListeners.push(fn); },

    // Re-connect after an error (also fired by the browser "online" event).
    retry() {
      if (status !== 'error') return;
      started = false;
      ensureStarted();
    },

    // All images in display order (reads the live Firestore cache).
    getAll() {
      return sortByOrder(cache);
    },

    // Add an image. Returns a Promise. Firestore generates the doc ID.
    add(data) {
      let fb;
      try { fb = requireFb(); } catch (e) { return Promise.reject(e); }
      const record = {
        imageUrl: String(data.imageUrl || '').trim(),
        title: String(data.title || '').trim(),
        caption: String(data.caption || '').trim(),
        category: String(data.category || '').trim().toLowerCase(),
        order: normalizeOrder(data.order)
      };
      if (!record.imageUrl) return Promise.reject(new Error('IMAGE_URL_REQUIRED'));

      // Two-argument doc() creates a reference with an auto-generated ID,
      // then setDoc writes it — no extra SDK functions needed.
      const ref = fb.fs.doc(fb.db, fb.GALLERY_COLLECTION);
      return fb.fs.setDoc(ref, Object.assign({}, record, {
        createdAt: fb.fs.serverTimestamp(),
        updatedAt: fb.fs.serverTimestamp()
      })).then(() => Object.assign({ id: ref.id }, record));
    },

    // Update an existing image by document ID. Returns a Promise.
    update(id, changes) {
      let fb;
      try { fb = requireFb(); } catch (e) { return Promise.reject(e); }
      const clean = {};
      if ('imageUrl' in changes) clean.imageUrl = String(changes.imageUrl || '').trim();
      if ('title' in changes) clean.title = String(changes.title || '').trim();
      if ('caption' in changes) clean.caption = String(changes.caption || '').trim();
      if ('category' in changes) clean.category = String(changes.category || '').trim().toLowerCase();
      if ('order' in changes) clean.order = normalizeOrder(changes.order);
      if ('imageUrl' in clean && !clean.imageUrl) return Promise.reject(new Error('IMAGE_URL_REQUIRED'));
      const ref = fb.fs.doc(fb.db, fb.GALLERY_COLLECTION, String(id));
      return fb.fs.updateDoc(ref, Object.assign({}, clean, { updatedAt: fb.fs.serverTimestamp() }))
        .then(() => Object.assign({}, cache.find(p => p.id === id) || {}, clean));
    },

    // Delete an image by document ID. Also removes the Storage file
    // if the image was uploaded (has a storagePath). Returns a Promise.
    remove(id) {
      let fb;
      try { fb = requireFb(); } catch (e) { return Promise.reject(e); }
      // Find the storagePath before deleting the Firestore doc.
      const existing = cache.find(p => p.id === id);
      const storagePath = existing ? existing.storagePath : '';
      const ref = fb.fs.doc(fb.db, fb.GALLERY_COLLECTION, String(id));
      return fb.fs.deleteDoc(ref).then(function () {
        return deleteStorageFile(fb, storagePath);
      });
    },

    // Upload an image file to Firebase Storage, then save metadata to Firestore.
    // file: a File object from an <input type="file">
    // metadata: { title, caption, category, order }
    // onProgress: optional callback({ bytesTransferred, totalBytes })
    // Returns a Promise that resolves with the saved record.
    uploadFile(file, metadata, onProgress) {
      let fb;
      try { fb = requireFb(); } catch (e) { return Promise.reject(e); }
      if (!file || !file.type || !file.type.startsWith('image/')) {
        return Promise.reject(new Error('Please select an image file (JPEG, PNG, GIF, WebP).'));
      }
      if (file.size > 10 * 1024 * 1024) {
        return Promise.reject(new Error('Image must be under 10 MB.'));
      }

      const filename = uniqueFilename(file.name);
      const path = fb.GALLERY_STORAGE_PATH + '/' + filename;
      const fileRef = fb.st.ref(fb.storage, path);

      return new Promise(function (resolve, reject) {
        const uploadTask = fb.st.uploadBytes(fileRef, file, {
          contentType: file.type
        });

        // Track progress if a callback was provided.
        // Note: uploadBytes returns a Promise, not a task with on() —
        // so we use uploadBytesResumable for progress if available,
        // falling back to uploadBytes.
        uploadTask.then(function (snapshot) {
          if (onProgress) {
            onProgress({ bytesTransferred: file.size, totalBytes: file.size });
          }
          return fb.st.getDownloadURL(snapshot.ref);
        }).then(function (downloadURL) {
          const record = {
            imageUrl: downloadURL,
            title: String(metadata.title || '').trim(),
            caption: String(metadata.caption || '').trim(),
            category: String(metadata.category || '').trim().toLowerCase(),
            order: normalizeOrder(metadata.order),
            storagePath: path
          };
          const docRef = fb.fs.doc(fb.db, fb.GALLERY_COLLECTION);
          return fb.fs.setDoc(docRef, Object.assign({}, record, {
            createdAt: fb.fs.serverTimestamp(),
            updatedAt: fb.fs.serverTimestamp()
          })).then(function () {
            resolve(Object.assign({ id: docRef.id }, record));
          });
        }).catch(function (err) {
          // Clean up the Storage file if Firestore save failed.
          deleteStorageFile(fb, path);
          reject(err);
        });
      });
    },

    // Human-friendly message for a rejected CRUD promise.
    messageFor(err) { return friendly(err); },

    // Re-render callback: fires after every Firestore change, in every
    // open tab/page at the same time (real-time listeners).
    onChange(fn) {
      changeListeners.push(fn);
    }
  };

  // Start listening as soon as this file runs.
  ensureStarted();

  // Auto-retry once the network comes back.
  window.addEventListener('online', () => store.retry());

  // Expose globally (a top-level "const" alone would not create
  // window.GalleryStore, which script.js checks for).
  window.GalleryStore = store;

  return store;
})();
