// ===== NOTICE STORE =====
// Single shared source of truth for every notice board on the site
// (Home Page, Notice Board page and the Admin panel).
// All pages read/write ONLY through NoticeStore, so any add/edit/delete
// made in admin.html is reflected everywhere automatically.
//
// Data lives in Firebase Firestore (collection: "notices"), so every
// visitor sees the same notices. A real-time listener (onSnapshot)
// keeps a local cache up to date; getAll() reads that cache, so the
// rest of the site keeps working exactly as before.
//
// Firestore is the ONLY source of truth — there is no localStorage
// fallback for notice data. See FIREBASE-SETUP.md for setup.

const NoticeStore = (() => {
  'use strict';

  // Used ONLY by migrate-notices.html to seed Firestore one time.
  // Do NOT remove these four notices.
  const SEED_NOTICES = [
    { date: '2026-08-24', title: 'Tram Test', details: 'Subject: Mathmatics || Time: 9:00 AM || Conference Room of CSE Department.', type: 'exam' },
    { date: '2026-08-25', title: 'Tram Test', details: 'Subject: EEE || Time: 9:00 AM || Conference Room of CSE Department.', type: 'exam' },
    { date: '2026-08-27', title: 'Tram Test', details: 'Subject: CSE || Time: 9:00 AM || Conference Room of CSE Department.', type: 'exam' },
    { date: '2026-08-30', title: 'Tram Test', details: 'Subject: Physics || Time: 9:00 AM || Conference Room of CSE Department.', type: 'exam' }
  ];

  const TYPES = ['exam', 'event', 'notice'];

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

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
    document.dispatchEvent(new CustomEvent('notices:changed'));
  }

  function sortByNewest(list) {
    return list.slice().sort((a, b) =>
      a.date === b.date ? String(b.id).localeCompare(String(a.id)) : b.date.localeCompare(a.date)
    );
  }

  // Firestore doc -> plain object used across the site.
  // Field names (title/details/date/type) are unchanged from the
  // original localStorage version on purpose.
  function toPlain(docSnap) {
    const d = docSnap.data() || {};
    return {
      id: docSnap.id,
      date: d.date || '',
      title: d.title || '',
      details: d.details || '',
      type: TYPES.indexOf(d.type) !== -1 ? d.type : 'notice'
    };
  }

  // ── deterministic stable IDs ────────────────────────────────
  // Same content always produces the same document ID, so the
  // migration never creates duplicates and identical notices can't
  // be added twice. FNV-1a 32-bit hash.
  function hashId(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  }

  function makeStableId(data) {
    const raw = [
      String(data.date || '').trim().toLowerCase(),
      String(data.type || '').trim().toLowerCase(),
      String(data.title || '').trim().toLowerCase(),
      String(data.details || '').trim().toLowerCase()
    ].join('|');
    return 'n-' + String(data.date || '') + '-' + hashId(raw);
  }

  // ── Firebase access ─────────────────────────────────────────
  // firebase-config.js loads asynchronously and announces itself
  // with window.NoticeFirebase + events. Wait for it here.
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
          'Could not connect to the notice service.';
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
    const colRef = fb.fs.collection(fb.db, fb.COLLECTION);

    unsubscribe = fb.fs.onSnapshot(colRef,
      snapshot => {
        cache = snapshot.docs.map(toPlain);
        setStatus('ready');
        readyResolve();
        emitChange();            // re-render every board instantly (real time)
      },
      err => {
        console.warn('[Notices] Firestore read failed:', err && err.code, err && err.message);
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
        console.warn('[Notices]', err && err.message);
        setStatus('error');
        readyReject(err);
        emitChange();
      });

    // Safety net: if the Firebase SDK never answers (e.g. offline),
    // stop showing "loading" after a while.
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

  function friendly(err) {
    if (err && err.message === 'DUPLICATE') {
      return 'An identical notice already exists on the board.';
    }
    if (err && err.message === 'FIREBASE_UNAVAILABLE') {
      return 'Cannot reach the notice service right now. Please try again later.';
    }
    const code = err && err.code;
    if (code === 'permission-denied') return 'You are not allowed to do that. Sign in as the admin first.';
    if (code === 'unavailable' || code === 'network-request-failed') return 'Network problem. Check your internet connection and try again.';
    return 'Something went wrong. Please try again.';
  }

  // ── public API ──────────────────────────────────────────────
  const store = {
    TYPES: TYPES,

    // The original 4 seed notices (kept only for the one-time migration).
    SEED_NOTICES: SEED_NOTICES,

    // Stable ID generator (used by migrate-notices.html too).
    makeStableId: makeStableId,

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

    // All notices, newest first (reads the live Firestore cache).
    getAll() {
      return sortByNewest(cache);
    },

    // Add a notice. Returns a Promise.
    add(data) {
      let fb;
      try { fb = requireFb(); } catch (e) { return Promise.reject(e); }
      const record = {
        date: data.date,
        title: data.title,
        details: data.details,
        type: TYPES.indexOf(data.type) !== -1 ? data.type : 'notice'
      };
      const id = makeStableId(record);
      const ref = fb.fs.doc(fb.db, fb.COLLECTION, id);
      return fb.fs.getDoc(ref).then(snap => {
        if (snap.exists()) throw new Error('DUPLICATE');
        return fb.fs.setDoc(ref, Object.assign({}, record, {
          id: id,
          createdAt: fb.fs.serverTimestamp(),
          updatedAt: fb.fs.serverTimestamp()
        }));
      }).then(() => Object.assign({ id: id }, record));
    },

    // Update an existing notice by its stable ID. Returns a Promise.
    update(id, changes) {
      let fb;
      try { fb = requireFb(); } catch (e) { return Promise.reject(e); }
      const clean = {};
      if ('date' in changes) clean.date = changes.date;
      if ('title' in changes) clean.title = changes.title;
      if ('details' in changes) clean.details = changes.details;
      if ('type' in changes) clean.type = TYPES.indexOf(changes.type) !== -1 ? changes.type : 'notice';
      const ref = fb.fs.doc(fb.db, fb.COLLECTION, String(id));
      return fb.fs.updateDoc(ref, Object.assign({}, clean, { updatedAt: fb.fs.serverTimestamp() }))
        .then(() => Object.assign({}, cache.find(n => n.id === id) || {}, clean));
    },

    // Delete a notice by its stable ID. Returns a Promise.
    remove(id) {
      let fb;
      try { fb = requireFb(); } catch (e) { return Promise.reject(e); }
      return fb.fs.deleteDoc(fb.fs.doc(fb.db, fb.COLLECTION, String(id)));
    },

    // Human-friendly message for a rejected CRUD promise.
    messageFor(err) { return friendly(err); },

    // ISO date ("2026-08-30") -> { day: "30", month: "August", year: 2026 }
    formatDate(iso) {
      const parts = String(iso).split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return { day: '', month: '', year: NaN };
      return { day: String(parts[2]), month: MONTHS[parts[1] - 1] || '', year: parts[0] };
    },

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
  // window.NoticeStore, which script.js checks for).
  window.NoticeStore = store;

  return store;
})();
