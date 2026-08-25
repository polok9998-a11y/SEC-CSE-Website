// ===== TOP BAR TEXT LIST =====
// Edit this ONE list to change the scrolling top bar message on every page.
// Add or remove lines freely - each item becomes a segment separated by ||
const TOP_BAR_TEXTS = [
  'Sylhet Engineering College',
  'Department of Computer Science & Engineering',
  'Batch 2026 Official Page',
  'Welcome to the official home of CSE Batch 2026',
  'We are a family of 67 students of the Department of Computer Science & Engineering at Sylhet Engineering College, united by one dream - to learn, grow and lead in the world of technology',
  'From late-night coding sessions to exam-week struggles, from freshers\' rally to project showcases - every moment of our four-year journey lives on this page',
  'This website is built and maintained by the students themselves, as a record of our friendship, our achievements and our legacy',
  'Explore our members, relive our memories in the gallery, stay updated with the notice board, and reach out anytime - this batch is always stronger together'
];

// Scroll speed of the top bar in seconds (smaller number = faster scrolling)
const TOP_BAR_SPEED_SECONDS = 220;

document.addEventListener('DOMContentLoaded', () => {

  // ===== 0. TOP BAR MARQUEE (builds the scrolling copies from TOP_BAR_TEXTS) =====
  const topBarTrack = document.querySelector('.top-bar-track');
  if (topBarTrack) {
    const topBarMessage = TOP_BAR_TEXTS.join(' || ');

    const srOnly = document.querySelector('.top-bar .sr-only');
    if (srOnly) srOnly.textContent = topBarMessage;

    const SEP = '\u00a0\u00a0||\u00a0\u00a0';
    for (let i = 0; i < 8; i++) {
      const span = document.createElement('span');
      span.textContent = topBarMessage + SEP;
      topBarTrack.appendChild(span);
    }

    topBarTrack.style.animationDuration = TOP_BAR_SPEED_SECONDS + 's';
  }

  // ===== 0b. STICKY TOP BAR + NAV OFFSET + MOBILE HAMBURGER MENU (all pages) =====
  // The .top-bar and nav are position:sticky in CSS. Here we only:
  //   1) measure the pinned Top Bar height into --topbar-h so the nav parks
  //      directly below it, and the combined pinned height into
  //      --sticky-offset so anchor links never land underneath them,
  //   2) wire the hamburger button on small screens.
  const rootEl = document.documentElement;
  const topBar = document.querySelector('.top-bar');
  const navBar = document.querySelector('nav');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('site-nav-menu');

  const smoothOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior = smoothOK ? 'smooth' : 'auto';

  function updateStickyOffset() {
    const topH = topBar ? topBar.offsetHeight : 0;
    const navH = navBar ? navBar.offsetHeight : 0;
    if (!topH && !navH) return;
    // where the sticky nav parks: directly below the Top Bar
    rootEl.style.setProperty('--topbar-h', topH + 'px');
    // total pinned height: anchor scroll clearance for bar + nav
    rootEl.style.setProperty('--sticky-offset', (topH + navH) + 'px');
  }
  updateStickyOffset();
  window.addEventListener('load', updateStickyOffset);

  function closeMobileNav() {
    if (!navMenu || !navToggle) return;
    navMenu.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation menu');
  }

  if (navToggle && navMenu) {
    // Collapses the link list on small screens ONLY when JS can reopen it.
    rootEl.classList.add('js-nav');
    updateStickyOffset();

    navToggle.addEventListener('click', () => {
      const willOpen = !navMenu.classList.contains('open');
      navMenu.classList.toggle('open', willOpen);
      navToggle.classList.toggle('open', willOpen);
      navToggle.setAttribute('aria-expanded', String(willOpen));
      navToggle.setAttribute('aria-label', willOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) {
        closeMobileNav();
        navToggle.focus();
      }
    });

    // Tap/click outside the open menu closes it.
    document.addEventListener('click', e => {
      if (!navMenu.classList.contains('open')) return;
      if (navToggle.contains(e.target) || navMenu.contains(e.target)) return;
      closeMobileNav();
    });

    // Selecting a section: always close the menu; if the link points at the
    // current page just scroll smoothly (to top or to the #target) instead
    // of reloading — cross-page links keep working as normal page loads.
    navMenu.addEventListener('click', e => {
      const link = e.target.closest('a');
      if (!link) return;
      closeMobileNav();
      try {
        const target = new URL(link.href, location.href);
        const here = new URL(location.href);
        if (target.pathname.replace(/\/+$/, '') === here.pathname.replace(/\/+$/, '')) {
          e.preventDefault();
          if (target.hash && target.hash !== '#') {
            const el = document.getElementById(decodeURIComponent(target.hash.slice(1)));
            if (el) { el.scrollIntoView({ behavior: scrollBehavior, block: 'start' }); return; }
          }
          window.scrollTo({ top: 0, behavior: scrollBehavior });
        }
      } catch (err) { /* malformed href: let the browser handle it */ }
    });
  }

  window.addEventListener('resize', () => {
    updateStickyOffset();
    if (window.innerWidth > 768) closeMobileNav();
  });

  // ===== 1. BACK TO TOP BUTTON (all pages) =====
  const topBtn = document.createElement('button');
  topBtn.id = 'back-to-top';
  topBtn.innerHTML = '&uarr;';
  topBtn.title = 'Back to top';
  document.body.appendChild(topBtn);

  window.addEventListener('scroll', () => {
    topBtn.classList.toggle('show', window.scrollY > 300);
  });

  topBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== 2. GALLERY LIGHTBOX (gallery.html) =====
  // Delegated on .gallery-grid, so it works for the Firestore-rendered
  // items as well as any static emoji tiles.
  const galleryGridForLightbox = document.querySelector('.gallery-grid');
  if (galleryGridForLightbox) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML =
      '<span class="lightbox-close">&times;</span>' +
      '<div class="lightbox-content"></div>';
    document.body.appendChild(lightbox);

    const content = lightbox.querySelector('.lightbox-content');

    galleryGridForLightbox.addEventListener('click', e => {
      const item = e.target.closest('.gallery-item');
      if (!item || item.classList.contains('gallery-skeleton')) return;

      content.textContent = '';

      const imgEl = item.querySelector('img.gallery-img');
      if (imgEl && imgEl.getAttribute('src')) {
        const big = document.createElement('img');
        big.className = 'lightbox-img';
        big.src = imgEl.getAttribute('src');
        big.alt = imgEl.alt || '';
        content.appendChild(big);
      } else {
        const emojiEl = item.querySelector('.gallery-emoji');
        const emoji = (emojiEl ? emojiEl.textContent : '').trim();
        if (emoji) {
          const em = document.createElement('div');
          em.className = 'lightbox-emoji';
          em.textContent = emoji;
          content.appendChild(em);
        }
      }

      const captionEl = item.querySelector('.gallery-caption');
      if (captionEl && captionEl.textContent.trim()) {
        const cap = document.createElement('p');
        cap.textContent = captionEl.textContent;
        content.appendChild(cap);
      }

      lightbox.classList.add('open');
    });

    lightbox.addEventListener('click', e => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
        lightbox.classList.remove('open');
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') lightbox.classList.remove('open');
    });
  }

  // ===== 2b. NOTICE BOARD RENDERING (index.html + notice.html) =====
  // Fills every [data-notices] container from the shared NoticeStore
  // (notices-data.js). Runs before the filter/reveal sections below so the
  // rendered items get the same animations as static markup.
  //
  // Hook filled in by the scroll-reveal section (section 10). Lets code
  // that renders content asynchronously join the reveal animation.
  let registerRevealEls = null;

  const noticeContainers = document.querySelectorAll('[data-notices]');
  if (noticeContainers.length > 0 && window.NoticeStore) {

    function buildNoticeItem(notice, withReveal) {
      const item = document.createElement('div');
      item.className = 'notice-item';
      if (withReveal) item.setAttribute('data-reveal', '');

      const date = NoticeStore.formatDate(notice.date);

      const dateBox = document.createElement('div');
      dateBox.className = 'notice-date';
      const dayEl = document.createElement('span');
      dayEl.className = 'day';
      dayEl.textContent = date.day;
      const monthEl = document.createElement('span');
      monthEl.className = 'month';
      monthEl.textContent = date.month;
      dateBox.appendChild(dayEl);
      dateBox.appendChild(monthEl);

      const body = document.createElement('div');
      body.className = 'notice-body';
      const titleEl = document.createElement('h4');
      titleEl.textContent = notice.title;
      const detailsEl = document.createElement('p');
      detailsEl.textContent = notice.details;
      const pill = document.createElement('span');
      const type = NoticeStore.TYPES.includes(notice.type) ? notice.type : 'notice';
      pill.className = 'notice-pill ' + type;
      pill.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      body.appendChild(titleEl);
      body.appendChild(detailsEl);
      body.appendChild(pill);

      item.appendChild(dateBox);
      item.appendChild(body);
      return item;
    }

    function showBoardMessage(container, text) {
      const message = document.createElement('p');
      message.className = 'no-result';
      message.textContent = text;
      container.textContent = '';
      container.appendChild(message);
    }

    // Same conditions as the scroll-reveal section below — only animate
    // when that section will actually be able to run the animation.
    function canAnimateReveal() {
      return 'IntersectionObserver' in window &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    let firstRender = true;
    function renderNoticeBoards() {
      const status = NoticeStore.getStatus();
      const notices = NoticeStore.getAll();

      noticeContainers.forEach(container => {
        if (status === 'error') {
          showBoardMessage(container, 'Unable to load notices right now. Please try again later.');
          return;
        }
        if (status !== 'loading' && notices.length === 0) {
          showBoardMessage(container, 'No notices have been published yet.');
          return;
        }
        container.textContent = '';
        const limit = parseInt(container.dataset.noticesLimit, 10);
        const visible = isNaN(limit) ? notices : notices.slice(0, limit);
        const renderedItems = [];
        visible.forEach(notice => {
          const item = buildNoticeItem(notice, firstRender && canAnimateReveal());
          container.appendChild(item);
          renderedItems.push(item);
        });
        // Notices load asynchronously from Firestore, so items may appear
        // after the reveal observer below has already been created —
        // register them for the animation here.
        if (registerRevealEls && renderedItems.length) {
          registerRevealEls(renderedItems);
        }
      });
      firstRender = false;
    }

    NoticeStore.onChange(renderNoticeBoards);

    if (NoticeStore.getStatus() === 'ready' || NoticeStore.getStatus() === 'error') {
      renderNoticeBoards();
    } else {
      NoticeStore.ready().then(renderNoticeBoards).catch(renderNoticeBoards);
    }
  }

  // ===== 3. NOTICE FILTER (notice.html) =====
  const noticesGrid = document.querySelector('.notices-grid');
  if (noticesGrid) {
    const noticeList = noticesGrid.querySelector('.notice-list');

    const filterBar = document.createElement('div');
    filterBar.className = 'filter-bar';
    filterBar.innerHTML =
      '<button class="filter-btn active" data-filter="all">All</button>' +
      '<button class="filter-btn" data-filter="exam">Exam</button>' +
      '<button class="filter-btn" data-filter="event">Event</button>' +
      '<button class="filter-btn" data-filter="notice">Notice</button>';
    noticeList.parentNode.insertBefore(filterBar, noticeList);

    filterBar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      noticeList.querySelectorAll('.notice-item').forEach(item => {
        const pill = item.querySelector('.notice-pill');
        const match = filter === 'all' || pill.classList.contains(filter);
        item.style.display = match ? '' : 'none';
      });
    });
  }

  // ===== 4. MEMBER LIVE SEARCH (member.html) =====
  const membersGrid = document.querySelector('.members-grid');
  if (membersGrid) {
    const searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.className = 'member-search';
    searchBox.placeholder = 'Search member by name or roll...';
    membersGrid.parentNode.insertBefore(searchBox, membersGrid);

    searchBox.addEventListener('input', () => {
      const query = searchBox.value.toLowerCase().trim();
      let visibleCount = 0;

      membersGrid.querySelectorAll('.member-card').forEach(card => {
        const name = card.querySelector('.member-name').textContent.toLowerCase();
        const roll = card.querySelector('.member-roll').textContent.toLowerCase();
        const match = name.includes(query) || roll.includes(query);
        card.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });

      let emptyMsg = membersGrid.parentNode.querySelector('.no-result');
      if (visibleCount === 0) {
        if (!emptyMsg) {
          emptyMsg = document.createElement('p');
          emptyMsg.className = 'no-result';
          emptyMsg.textContent = 'No members found.';
          membersGrid.parentNode.appendChild(emptyMsg);
        }
        emptyMsg.style.display = 'block';
      } else if (emptyMsg) {
        emptyMsg.style.display = 'none';
      }
    });
  }
  // ===== 5. DARK / LIGHT MODE TOGGLE (all pages) =====
  const sunIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moonIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  const themeBtn = document.createElement('button');
  themeBtn.className = 'theme-toggle';
  themeBtn.title = 'Toggle dark / light mode';

  const headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.appendChild(themeBtn);

  function applyTheme(theme) {
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
    document.body.classList.toggle('dark-mode', theme === 'dark');
    themeBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
  }

  let currentTheme = localStorage.getItem('theme');
  if (!currentTheme) {
    currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme(currentTheme);

  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
  // ===== 7. MEMBER STATS (member.html) =====
  const statTotal = document.querySelector('[data-stat="total"]');
  if (statTotal) {
    const cards = document.querySelectorAll('.member-card');
    statTotal.textContent = cards.length;
    const crEl = document.querySelector('[data-stat="cr"]');
    const acrEl = document.querySelector('[data-stat="acr"]');
    if (crEl) crEl.textContent = document.querySelectorAll('.member-role.cr').length;
    if (acrEl) acrEl.textContent = document.querySelectorAll('.member-role.acr').length;
  }

  // ===== 6. TYPING EFFECT (elements with .js-typing) =====
  const typeTargets = document.querySelectorAll('.js-typing');
  if (typeTargets.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

    function setupTyping(el, startDelay) {
      const segments = [];
      el.childNodes.forEach(node => {
        const text = node.textContent.trim();
        if (!text) return;
        segments.push({ text: text, accent: node.nodeType === Node.ELEMENT_NODE });
      });

      el.textContent = '';
      const caret = document.createElement('span');
      caret.className = 'type-caret';
      el.appendChild(caret);

      let segIndex = 0, charIndex = 0, currentSpan = null;

      function typeStep() {
        if (segIndex >= segments.length) {
          caret.remove();
          return;
        }
        const seg = segments[segIndex];

        if (charIndex >= seg.text.length) {
          segIndex++;
          charIndex = 0;
          currentSpan = null;
          typeStep();
          return;
        }

        const ch = seg.text[charIndex];
        if (seg.accent) {
          if (!currentSpan) {
            currentSpan = document.createElement('span');
            el.insertBefore(currentSpan, caret);
          }
          currentSpan.textContent += ch;
        } else {
          el.insertBefore(document.createTextNode(ch), caret);
        }
        charIndex++;
        setTimeout(typeStep, 80);
      }

      setTimeout(typeStep, startDelay);
    }

    typeTargets.forEach(el => setupTyping(el, 400));
  }

  // ===== 8. HERO MOTIVATIONAL QUOTE TYPEWRITER (index.html) =====
  const typedQuote = document.getElementById('typed-quote');
  if (typedQuote) {
    const quotes = [
      'Learn Today, Lead Tomorrow.',
      'Dream Big. Study Hard. Stay Focused.',
      'Your Future Starts With What You Learn Today.',
      'Keep Learning, Keep Growing.',
      'Small Steps Today, Big Success Tomorrow.',
      'Believe In Yourself. Never Stop Learning.',
      'Knowledge Is The Key To Your Future.'
    ];

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      // No animation: show first quote statically with a still cursor
      typedQuote.textContent = '"' + quotes[0] + '"';
      const staticCaret = typedQuote.nextElementSibling;
      if (staticCaret && staticCaret.classList.contains('type-caret')) {
        staticCaret.style.animation = 'none';
      }
    } else {
      const TYPE_SPEED = 62;      // ms per character while typing
      const TYPE_JITTER = 45;     // random extra delay for a natural feel
      const DELETE_SPEED = 30;    // ms per character while deleting
      const HOLD_FULL = 2500;     // pause when quote is fully typed
      const HOLD_EMPTY = 450;     // pause before next quote starts

      let qIndex = 0;
      let cIndex = 0;
      let deleting = false;

      function tick() {
        const full = '"' + quotes[qIndex] + '"';

        if (!deleting) {
          cIndex++;
          typedQuote.textContent = full.slice(0, cIndex);

          if (cIndex >= full.length) {
            deleting = true;
            setTimeout(tick, HOLD_FULL);
            return;
          }
          setTimeout(tick, TYPE_SPEED + Math.random() * TYPE_JITTER);
        } else {
          cIndex--;
          typedQuote.textContent = full.slice(0, cIndex);

          if (cIndex <= 0) {
            deleting = false;
            qIndex = (qIndex + 1) % quotes.length;
            setTimeout(tick, HOLD_EMPTY);
            return;
          }
          setTimeout(tick, DELETE_SPEED);
        }
      }

      setTimeout(tick, 800);
    }
  }

  // ===== 9. MEMBER CARD SCROLL REVEAL (member.html) =====
  if (membersGrid && 'IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

    const revealCards = membersGrid.querySelectorAll('.member-card');
    membersGrid.classList.add('js-reveal');

    const STAGGER_MS = 90;    // delay between neighbouring cards
    const MAX_DELAY_MS = 450; // cap so lower rows never wait too long

    revealCards.forEach((card, i) => {
      card.style.setProperty('--reveal-delay', Math.min(i * STAGGER_MS, MAX_DELAY_MS) + 'ms');
    });

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealCards.forEach(card => revealObserver.observe(card));
  }

  // ===== 10. GENERIC SCROLL REVEAL ([data-reveal], all pages) =====
  // .js class is added ONLY when the animation will actually run,
  // so content stays visible if JS is off or reduced motion is requested.
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length > 0 && 'IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

    document.documentElement.classList.add('js');

    // stagger cards that share the same parent grid
    const groupCounts = new Map();
    revealEls.forEach(el => {
      const parent = el.parentNode;
      const index = groupCounts.get(parent) || 0;
      groupCounts.set(parent, index + 1);
      el.style.setProperty('--reveal-delay', Math.min(index * 90, 450) + 'ms');
    });

    const genericRevealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        genericRevealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => genericRevealObserver.observe(el));

    // Let asynchronously rendered elements (notices from Firestore) join
    // the same reveal system with the same stagger behaviour.
    registerRevealEls = function (els) {
      els.forEach((el, i) => {
        if (el.hasAttribute('data-reveal')) {
          el.style.setProperty('--reveal-delay', Math.min(i * 90, 450) + 'ms');
          genericRevealObserver.observe(el);
        }
      });
    };
  }

  // ===== 11. PUBLIC GALLERY — FIRESTORE RENDERING + FILTER (gallery.html) =====
  // Fills [data-gallery-grid] from the shared GalleryStore (gallery-data.js).
  // Admin adds/edits/deletes images in admin.html; this grid updates
  // automatically through the same real-time listener.
  const galleryGrid = document.querySelector('[data-gallery-grid]');
  if (galleryGrid && window.GalleryStore) {

    let currentFilter = 'all';
    let galleryFilterBar = null;

    function showGalleryMessage(text) {
      const message = document.createElement('p');
      message.className = 'no-result';
      message.textContent = text;
      return message;
    }

    function buildGalleryItem(photo, withReveal) {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      if (withReveal) item.setAttribute('data-reveal', '');
      if (photo.category) item.dataset.category = photo.category;

      const img = document.createElement('img');
      img.className = 'gallery-img';
      img.loading = 'lazy';
      img.src = photo.imageUrl;
      img.alt = photo.title || photo.caption || 'Gallery photo';
      // Graceful fallback for invalid/broken image URLs.
      img.addEventListener('error', () => {
        img.remove();
        item.classList.add('broken');
        if (!item.querySelector('.gallery-emoji')) {
          const fallback = document.createElement('span');
          fallback.className = 'gallery-emoji';
          fallback.textContent = '\u{1F5BC}\uFE0F'; // framed picture
          item.insertBefore(fallback, item.firstChild);
        }
      });
      item.appendChild(img);

      const label = photo.title || photo.caption;
      if (label) {
        const cap = document.createElement('div');
        cap.className = 'gallery-caption';
        cap.textContent = label;
        item.appendChild(cap);
      }

      return item;
    }

    // Rebuilds the category filter bar from the live data (same
    // .filter-bar / .filter-btn design as the Notice Board).
    function rebuildGalleryFilter(photos) {
      if (galleryFilterBar) { galleryFilterBar.remove(); galleryFilterBar = null; }

      const categories = [];
      photos.forEach(p => {
        if (p.category && categories.indexOf(p.category) === -1) categories.push(p.category);
      });
      if (categories.length === 0) return;

      if (categories.indexOf(currentFilter) === -1) currentFilter = 'all';

      galleryFilterBar = document.createElement('div');
      galleryFilterBar.className = 'filter-bar';

      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'filter-btn' + (currentFilter === 'all' ? ' active' : '');
      allBtn.dataset.filter = 'all';
      allBtn.textContent = 'All';
      galleryFilterBar.appendChild(allBtn);

      categories.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-btn' + (currentFilter === c ? ' active' : '');
        btn.dataset.filter = c;
        btn.textContent = c.charAt(0).toUpperCase() + c.slice(1);
        galleryFilterBar.appendChild(btn);
      });

      galleryFilterBar.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        currentFilter = btn.dataset.filter;
        galleryFilterBar.querySelectorAll('.filter-btn').forEach(b =>
          b.classList.toggle('active', b === btn));
        applyGalleryFilter();
      });

      galleryGrid.parentNode.insertBefore(galleryFilterBar, galleryGrid);
    }

    function applyGalleryFilter() {
      galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
        if (item.classList.contains('gallery-skeleton')) return;
        const match = currentFilter === 'all' || item.dataset.category === currentFilter;
        item.style.display = match ? '' : 'none';
      });
    }

    // Same conditions as the scroll-reveal section — only animate when the
    // reveal observer will actually be able to run.
    function canAnimateReveal() {
      return 'IntersectionObserver' in window &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    let firstRender = true;
    function renderPublicGallery() {
      const status = GalleryStore.getStatus();
      const photos = GalleryStore.getAll().filter(p => p.imageUrl);

      if (status === 'loading') {
        galleryGrid.textContent = '';
        for (let i = 0; i < 7; i++) {
          const skeleton = document.createElement('div');
          skeleton.className = 'gallery-item gallery-skeleton';
          skeleton.setAttribute('aria-hidden', 'true');
          galleryGrid.appendChild(skeleton);
        }
        return;
      }

      galleryGrid.textContent = '';

      if (status === 'error') {
        galleryGrid.appendChild(showGalleryMessage('Unable to load the gallery right now. Please try again later.'));
        rebuildGalleryFilter([]);
        return;
      }

      if (photos.length === 0) {
        galleryGrid.appendChild(showGalleryMessage('No photos have been added yet.'));
        rebuildGalleryFilter([]);
        return;
      }

      const animate = firstRender && canAnimateReveal();
      const renderedItems = [];
      photos.forEach(photo => {
        const item = buildGalleryItem(photo, animate);
        galleryGrid.appendChild(item);
        renderedItems.push(item);
      });
      firstRender = false;

      // Items appear after the reveal observer was created — register them
      // for the same reveal animation as everything else.
      if (registerRevealEls && renderedItems.length) {
        registerRevealEls(renderedItems);
      }

      rebuildGalleryFilter(photos);
      applyGalleryFilter();
    }

    GalleryStore.onChange(renderPublicGallery);

    if (GalleryStore.getStatus() === 'ready' || GalleryStore.getStatus() === 'error') {
      renderPublicGallery();
    } else {
      GalleryStore.ready().then(renderPublicGallery).catch(renderPublicGallery);
    }
  }

  // ===== 12. NOTICE ADMIN PANEL — FIREBASE AUTH + FIRESTORE (admin.html) =====
  const adminForm = document.getElementById('admin-notice-form');
  if (adminForm && window.NoticeStore) {
    const adminFields = {
      id: document.getElementById('admin-id'),
      title: document.getElementById('admin-title'),
      details: document.getElementById('admin-details'),
      date: document.getElementById('admin-date'),
      type: document.getElementById('admin-type')
    };
    const formHeading = document.getElementById('admin-form-heading');
    const submitBtn = document.getElementById('admin-submit');
    const cancelBtn = document.getElementById('admin-cancel-edit');
    const statusEl = document.getElementById('admin-status');
    const adminList = document.getElementById('admin-list');

    // ── Auth gate elements (see admin.html) ──
    const loginCard = document.getElementById('admin-auth-card');
    const loginForm = document.getElementById('admin-login-form');
    const loginEmail = document.getElementById('admin-email');
    const loginPassword = document.getElementById('admin-password');
    const loginSubmitBtn = document.getElementById('admin-login-submit');
    const authStatusEl = document.getElementById('admin-auth-status');
    const panelWrap = document.getElementById('admin-panel');
    const userBarEl = document.getElementById('admin-user-bar');
    const userEmailEl = document.getElementById('admin-user-email');
    const logoutBtn = document.getElementById('admin-logout');

    // UID of the signed-in account while it is an authorized admin,
    // otherwise null. This is a FAST client-side guard only — the real
    // enforcement happens in firestore.rules on Google's servers.
    let signedInAdminUid = null;

    // Fail-fast check used before every write request. Fails closed:
    // until Firebase Auth confirms an authorized admin, nothing is sent.
    function requireAdminSignIn() {
      if (signedInAdminUid) return true;
      setStatus('Please sign in as the admin first.', true);
      return false;
    }

    // Waits for firebase-config.js to finish loading the SDK.
    function whenFirebaseReady(timeoutMs) {
      return new Promise((resolve, reject) => {
        const fb = window.NoticeFirebase;
        if (fb && fb.ready) { resolve(fb); return; }
        if (fb && fb.ready === false) { reject(new Error(fb.error || 'Firebase is not configured.')); return; }
        let done = false;
        const ok = () => { if (!done) { done = true; cleanup(); resolve(window.NoticeFirebase); } };
        const bad = () => {
          if (done) return;
          done = true; cleanup();
          reject(new Error((window.NoticeFirebase && window.NoticeFirebase.error) || 'Could not load Firebase.'));
        };
        function cleanup() {
          clearTimeout(timer);
          document.removeEventListener('noticefirebase:ready', ok);
          document.removeEventListener('noticefirebase:failed', bad);
        }
        const timer = setTimeout(bad, timeoutMs || 15000);
        document.addEventListener('noticefirebase:ready', ok);
        document.addEventListener('noticefirebase:failed', bad);
      });
    }

    function setStatus(message, isError) {
      statusEl.textContent = message;
      statusEl.classList.toggle('error', !!isError);
      statusEl.style.display = message ? 'block' : 'none';
    }

    function resetForm() {
      adminForm.reset();
      adminFields.id.value = '';
      adminFields.date.value = new Date().toISOString().slice(0, 10);
      formHeading.textContent = 'Add New Notice';
      submitBtn.textContent = 'Add Notice';
      cancelBtn.style.display = 'none';
    }

    adminForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!requireAdminSignIn()) return;
      const data = {
        title: adminFields.title.value.trim(),
        details: adminFields.details.value.trim(),
        date: adminFields.date.value,
        type: adminFields.type.value
      };
      if (!data.title || !data.details || !data.date) {
        setStatus('Please fill in every field.', true);
        return;
      }
      const editId = adminFields.id.value;
      submitBtn.disabled = true;
      cancelBtn.disabled = true;

      const request = editId ? NoticeStore.update(editId, data) : NoticeStore.add(data);
      request.then(() => {
        resetForm();
        if (editId) {
          setStatus('Notice updated. The Notice Board and Home Page are in sync.');
        } else {
          setStatus('Notice added. It is now live on the Notice Board and Home Page.');
        }
      }).catch(err => {
        setStatus(NoticeStore.messageFor ? NoticeStore.messageFor(err) : 'Could not save the notice. Please try again.', true);
      }).finally(() => {
        submitBtn.disabled = false;
        cancelBtn.disabled = false;
      });
    });

    cancelBtn.addEventListener('click', resetForm);

    adminList.addEventListener('click', e => {
      const row = e.target.closest('.admin-item');
      if (!row) return;
      const id = row.dataset.id;

      if (e.target.classList.contains('delete')) {
        if (!requireAdminSignIn()) return;
        if (window.confirm('Delete this notice permanently?')) {
          if (adminFields.id.value === id) resetForm();
          e.target.disabled = true;
          NoticeStore.remove(id)
            .then(() => setStatus('Notice deleted from the board.'))
            .catch(err => {
              setStatus(NoticeStore.messageFor ? NoticeStore.messageFor(err) : 'Could not delete the notice. Please try again.', true);
              e.target.disabled = false;
            });
        }
        return;
      }

      if (e.target.classList.contains('edit')) {
        const notice = NoticeStore.getAll().find(n => n.id === id);
        if (!notice) return;
        adminFields.id.value = notice.id;
        adminFields.title.value = notice.title;
        adminFields.details.value = notice.details;
        adminFields.date.value = notice.date;
        adminFields.type.value = notice.type;
        formHeading.textContent = 'Edit Notice';
        submitBtn.textContent = 'Update Notice';
        cancelBtn.style.display = '';
        setStatus('Editing "' + notice.title + '".', false);
        adminForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    function renderAdminList() {
      const notices = NoticeStore.getAll();
      const editingId = adminFields.id.value;

      adminList.textContent = '';
      if (notices.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'no-result';
        empty.textContent = 'No notices yet. Add your first one with the form.';
        adminList.appendChild(empty);
        return;
      }

      notices.forEach(notice => {
        const date = NoticeStore.formatDate(notice.date);

        const item = document.createElement('div');
        item.className = 'admin-item' + (notice.id === editingId ? ' editing' : '');
        item.dataset.id = notice.id;

        const info = document.createElement('div');
        info.className = 'admin-item-info';
        const titleEl = document.createElement('strong');
        titleEl.textContent = notice.title;
        const dateEl = document.createElement('span');
        dateEl.className = 'admin-item-date';
        dateEl.textContent = date.day + ' ' + date.month + ' ' + date.year;
        const pill = document.createElement('span');
        pill.className = 'notice-pill ' + notice.type;
        pill.textContent = notice.type.charAt(0).toUpperCase() + notice.type.slice(1);
        info.appendChild(titleEl);
        info.appendChild(dateEl);
        info.appendChild(pill);

        const actions = document.createElement('div');
        actions.className = 'admin-item-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'admin-btn edit';
        editBtn.textContent = 'Edit';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'admin-btn delete';
        deleteBtn.textContent = 'Delete';
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(info);
        item.appendChild(actions);
        adminList.appendChild(item);
      });
    }

    // ── Firebase Authentication gate ─────────────────────────────
    // The management panel stays hidden until Firebase Auth reports a
    // signed-in user whose UID is listed in ADMIN_UIDS (firebase-config.js).
    // Real write protection is enforced by firestore.rules on the server.
    function setAuthStatus(message, isError) {
      if (!authStatusEl) return;
      authStatusEl.textContent = message || '';
      authStatusEl.classList.toggle('error', !!isError);
      authStatusEl.style.display = message ? 'block' : 'none';
    }

    function showView(view) {
      if (loginCard) loginCard.hidden = view !== 'login';
      if (panelWrap) panelWrap.hidden = view !== 'panel';
      const unauthCard = document.getElementById('admin-unauthorized-card');
      if (unauthCard) unauthCard.hidden = view !== 'unauthorized';
    }

    function friendlyAuthError(err) {
      switch (err && err.code) {
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/user-disabled': return 'This account has been disabled.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': return 'Incorrect email or password.';
        case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
        case 'auth/network-request-failed': return 'Network problem. Check your internet connection and try again.';
        default: return 'Sign-in failed. Please try again.';
      }
    }

    function applyAuthState(fb, user) {
      // Keep the write-guard in sync with the real auth state.
      signedInAdminUid = (user && fb.isAdminUid(user.uid)) ? user.uid : null;
      if (!user) {
        showView('login');
        setAuthStatus('');
        return;
      }
      if (!fb.isAdminUid(user.uid)) {
        const unauthEmail = document.getElementById('admin-unauthorized-email');
        if (unauthEmail) unauthEmail.textContent = user.email || '';
        showView('unauthorized');
        return;
      }
      if (userEmailEl) userEmailEl.textContent = user.email || '';
      showView('panel');
    }

    whenFirebaseReady().then(fb => {
      fb.authApi.onAuthStateChanged(fb.auth, user => applyAuthState(fb, user));

      if (loginForm) {
        loginForm.addEventListener('submit', e => {
          e.preventDefault();
          const email = loginEmail.value.trim();
          const password = loginPassword.value;
          if (!email || !password) {
            setAuthStatus('Enter your email and password.', true);
            return;
          }
          loginSubmitBtn.disabled = true;
          setAuthStatus('Signing in\u2026', false);
          fb.authApi.signInWithEmailAndPassword(fb.auth, email, password)
            .then(() => {
              loginForm.reset();
              setAuthStatus('');
            })
            .catch(err => setAuthStatus(friendlyAuthError(err), true))
            .finally(() => { loginSubmitBtn.disabled = false; });
        });
      }

      function doLogout() {
        fb.authApi.signOut(fb.auth)
          .catch(() => setStatus('Could not sign out. Please try again.', true));
      }
      if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
      const unauthLogoutBtn = document.getElementById('admin-unauthorized-logout');
      if (unauthLogoutBtn) unauthLogoutBtn.addEventListener('click', doLogout);
    }).catch(err => {
      console.warn('[Admin]', err && err.message);
      showView('login');
      setAuthStatus('Cannot reach the sign-in service right now. Please try again later.', true);
    });

    renderAdminList();
    resetForm();

    // Keeps the admin list in sync too (changes made here appear on every
    // visitor's screen instantly through Firestore real-time listeners).
    NoticeStore.onChange(renderAdminList);
  }

  // ===== 13. GALLERY ADMIN PANEL (admin.html) =====
  // Lives inside the same #admin-panel auth gate as the notice tools, so it
  // is only visible to the signed-in admin. Writes are additionally
  // protected server-side by firestore.rules.
  const galleryForm = document.getElementById('gallery-admin-form');
  if (galleryForm && window.GalleryStore) {
    const gFields = {
      id: document.getElementById('g-id'),
      url: document.getElementById('g-url'),
      title: document.getElementById('g-title'),
      caption: document.getElementById('g-caption'),
      category: document.getElementById('g-category'),
      order: document.getElementById('g-order'),
      fileData: document.getElementById('g-file-data')
    };
    const gHeading = document.getElementById('g-form-heading');
    const gSubmitBtn = document.getElementById('g-submit');
    const gCancelBtn = document.getElementById('g-cancel-edit');
    const gStatusEl = document.getElementById('g-status');
    const gList = document.getElementById('gallery-admin-list');

    // File upload elements
    const gUploadZone = document.getElementById('g-upload-zone');
    const gUploadArea = document.getElementById('g-upload-area');
    const gFileInput = document.getElementById('g-file');
    const gPreview = document.getElementById('g-preview');
    const gPreviewImg = document.getElementById('g-preview-img');
    const gPreviewRemove = document.getElementById('g-preview-remove');
    const gProgress = document.getElementById('g-progress');
    const gProgressFill = document.getElementById('g-progress-fill');
    const gProgressText = document.getElementById('g-progress-text');
    const gUrlInput = document.getElementById('g-url-input');
    const gModeUpload = document.getElementById('g-mode-upload');
    const gModeUrl = document.getElementById('g-mode-url');

    let currentMode = 'upload'; // 'upload' or 'url'
    let selectedFile = null;

    // Client-side fail-fast guard for gallery writes — mirrors the notice
    // panel guard above. Real enforcement lives in firestore.rules.
    let signedInGalleryAdmin = false;

    function requireGalleryAdminSignIn() {
      if (signedInGalleryAdmin) return true;
      setGalleryStatus('Please sign in as the admin first.', true);
      return false;
    }

    // Watches Firebase Auth state once firebase-config.js finishes loading
    // the SDK. Fails closed: while nobody (or a non-admin) is signed in,
    // every gallery write is blocked locally before any request is sent.
    function watchGalleryAuth() {
      const fb = window.NoticeFirebase;
      if (!fb || !fb.ready) {
        document.addEventListener('noticefirebase:ready', function onReady() {
          document.removeEventListener('noticefirebase:ready', onReady);
          watchGalleryAuth();
        });
        return;
      }
      fb.authApi.onAuthStateChanged(fb.auth, user => {
        signedInGalleryAdmin = !!user && fb.isAdminUid(user.uid);
      });
    }
    watchGalleryAuth();

    function setGalleryStatus(message, isError) {
      gStatusEl.textContent = message;
      gStatusEl.classList.toggle('error', !!isError);
      gStatusEl.style.display = message ? 'block' : 'none';
    }

    // ── Mode toggle (upload vs URL) ──
    function switchMode(mode) {
      currentMode = mode;
      if (gModeUpload) gModeUpload.classList.toggle('active', mode === 'upload');
      if (gModeUrl) gModeUrl.classList.toggle('active', mode === 'url');
      if (gUploadZone) gUploadZone.hidden = mode !== 'upload';
      if (gUrlInput) gUrlInput.hidden = mode !== 'url';
    }

    if (gModeUpload) gModeUpload.addEventListener('click', function () { switchMode('upload'); });
    if (gModeUrl) gModeUrl.addEventListener('click', function () { switchMode('url'); });

    // ── File upload zone: click to browse ──
    if (gUploadArea && gFileInput) {
      gUploadArea.addEventListener('click', function () { gFileInput.click(); });
      gFileInput.addEventListener('change', function () {
        if (gFileInput.files && gFileInput.files[0]) {
          handleFileSelect(gFileInput.files[0]);
        }
      });

      // Drag and drop
      gUploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        gUploadArea.classList.add('dragover');
      });
      gUploadArea.addEventListener('dragleave', function () {
        gUploadArea.classList.remove('dragover');
      });
      gUploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        gUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileSelect(e.dataTransfer.files[0]);
        }
      });
    }

    function handleFileSelect(file) {
      if (!file.type.startsWith('image/')) {
        setGalleryStatus('Please select an image file (JPEG, PNG, GIF, WebP).', true);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setGalleryStatus('Image must be under 10 MB.', true);
        return;
      }
      selectedFile = file;
      setGalleryStatus('', false);

      // Show preview
      var reader = new FileReader();
      reader.onload = function (ev) {
        if (gPreviewImg) gPreviewImg.src = ev.target.result;
        if (gPreview) gPreview.hidden = false;
        if (gUploadArea) gUploadArea.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }

    if (gPreviewRemove) {
      gPreviewRemove.addEventListener('click', function () {
        selectedFile = null;
        if (gFileInput) gFileInput.value = '';
        if (gPreview) gPreview.hidden = true;
        if (gPreviewImg) gPreviewImg.src = '';
        if (gUploadArea) gUploadArea.style.display = '';
      });
    }

    function showUploadProgress(percent) {
      if (gProgress) gProgress.hidden = false;
      if (gProgressFill) gProgressFill.style.width = Math.min(100, Math.round(percent)) + '%';
      if (gProgressText) gProgressText.textContent = percent >= 100 ? 'Processing...' : 'Uploading... ' + Math.round(percent) + '%';
    }

    function hideUploadProgress() {
      if (gProgress) gProgress.hidden = true;
      if (gProgressFill) gProgressFill.style.width = '0%';
    }

    function resetGalleryForm() {
      galleryForm.reset();
      gFields.id.value = '';
      gFields.fileData.value = '';
      selectedFile = null;
      if (gFileInput) gFileInput.value = '';
      if (gPreview) gPreview.hidden = true;
      if (gPreviewImg) gPreviewImg.src = '';
      if (gUploadArea) gUploadArea.style.display = '';
      hideUploadProgress();
      gHeading.textContent = 'Add Gallery Image';
      gSubmitBtn.textContent = 'Add Image';
      gCancelBtn.style.display = 'none';
      switchMode('upload');
    }

    function validateUrlMode() {
      var data = {
        imageUrl: gFields.url.value.trim(),
        title: gFields.title.value.trim(),
        caption: gFields.caption.value.trim(),
        category: gFields.category.value.trim(),
        order: gFields.order.value.trim()
      };
      if (!data.imageUrl) return { error: 'Please enter an image URL.' };
      try {
        var parsed = new URL(data.imageUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return { error: 'The image URL must start with http:// or https://.' };
        }
      } catch (e) {
        return { error: 'That does not look like a valid image URL.' };
      }
      if (data.order !== '' && (!isFinite(Number(data.order)) || Number(data.order) < 0)) {
        return { error: 'Display order must be a number of 0 or more (or left empty).' };
      }
      return { data: data };
    }

    galleryForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!requireGalleryAdminSignIn()) return;

      var editId = gFields.id.value;
      var metadata = {
        title: gFields.title.value.trim(),
        caption: gFields.caption.value.trim(),
        category: gFields.category.value.trim(),
        order: gFields.order.value.trim()
      };

      if (metadata.order !== '' && (!isFinite(Number(metadata.order)) || Number(metadata.order) < 0)) {
        setGalleryStatus('Display order must be a number of 0 or more (or left empty).', true);
        return;
      }

      gSubmitBtn.disabled = true;
      gCancelBtn.disabled = true;

      // ── EDIT MODE: always uses URL mode (update existing record) ──
      if (editId) {
        if (currentMode === 'url') {
          var result = validateUrlMode();
          if (result.error) {
            setGalleryStatus(result.error, true);
            gSubmitBtn.disabled = false;
            gCancelBtn.disabled = false;
            return;
          }
          GalleryStore.update(editId, result.data).then(function () {
            resetGalleryForm();
            setGalleryStatus('Image updated. The public Gallery page is in sync.');
          }).catch(function (err) {
            setGalleryStatus(GalleryStore.messageFor(err), true);
          }).finally(function () {
            gSubmitBtn.disabled = false;
            gCancelBtn.disabled = false;
          });
        } else {
          // Editing metadata only (no new file in edit mode)
          GalleryStore.update(editId, metadata).then(function () {
            resetGalleryForm();
            setGalleryStatus('Image updated. The public Gallery page is in sync.');
          }).catch(function (err) {
            setGalleryStatus(GalleryStore.messageFor(err), true);
          }).finally(function () {
            gSubmitBtn.disabled = false;
            gCancelBtn.disabled = false;
          });
        }
        return;
      }

      // ── ADD MODE ──
      if (currentMode === 'upload' && selectedFile) {
        // File upload path
        showUploadProgress(0);
        GalleryStore.uploadFile(selectedFile, metadata, function (progress) {
          showUploadProgress(progress.totalBytes > 0 ? (progress.bytesTransferred / progress.totalBytes) * 100 : 0);
        }).then(function () {
          hideUploadProgress();
          resetGalleryForm();
          setGalleryStatus('Image uploaded successfully. It is now live on the public Gallery page.');
        }).catch(function (err) {
          hideUploadProgress();
          setGalleryStatus(GalleryStore.messageFor(err), true);
        }).finally(function () {
          gSubmitBtn.disabled = false;
          gCancelBtn.disabled = false;
        });
      } else if (currentMode === 'url') {
        // URL path
        var urlResult = validateUrlMode();
        if (urlResult.error) {
          setGalleryStatus(urlResult.error, true);
          gSubmitBtn.disabled = false;
          gCancelBtn.disabled = false;
          return;
        }
        GalleryStore.add(urlResult.data).then(function () {
          resetGalleryForm();
          setGalleryStatus('Image added. It is now live on the public Gallery page.');
        }).catch(function (err) {
          var msg = GalleryStore.messageFor(err);
          if (err && err.message === 'IMAGE_URL_REQUIRED') msg = 'Please enter an image URL.';
          setGalleryStatus(msg, true);
        }).finally(function () {
          gSubmitBtn.disabled = false;
          gCancelBtn.disabled = false;
        });
      } else {
        setGalleryStatus('Please select an image file or switch to URL mode.', true);
        gSubmitBtn.disabled = false;
        gCancelBtn.disabled = false;
      }
    });

    gCancelBtn.addEventListener('click', resetGalleryForm);

    gList.addEventListener('click', e => {
      const row = e.target.closest('.admin-item');
      if (!row) return;
      const id = row.dataset.id;

      if (e.target.classList.contains('delete')) {
        if (!requireGalleryAdminSignIn()) return;
        if (window.confirm('Delete this gallery image permanently?')) {
          if (gFields.id.value === id) resetGalleryForm();
          e.target.disabled = true;
          GalleryStore.remove(id)
            .then(() => setGalleryStatus('Image deleted from the gallery.'))
            .catch(err => {
              setGalleryStatus(GalleryStore.messageFor(err), true);
              e.target.disabled = false;
            });
        }
        return;
      }

      if (e.target.classList.contains('edit')) {
        const photo = GalleryStore.getAll().find(p => p.id === id);
        if (!photo) return;
        gFields.id.value = photo.id;
        gFields.url.value = photo.imageUrl;
        gFields.title.value = photo.title;
        gFields.caption.value = photo.caption;
        gFields.category.value = photo.category;
        gFields.order.value = photo.order === null ? '' : photo.order;
        gHeading.textContent = 'Edit Gallery Image';
        gSubmitBtn.textContent = 'Update Image';
        gCancelBtn.style.display = '';
        // In edit mode, default to URL mode so the existing URL is pre-filled
        switchMode('url');
        selectedFile = null;
        if (gFileInput) gFileInput.value = '';
        if (gPreview) gPreview.hidden = true;
        if (gUploadArea) gUploadArea.style.display = '';
        setGalleryStatus('Editing "' + (photo.title || photo.imageUrl) + '".', false);
        galleryForm.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      }
    });

    function renderGalleryAdminList() {
      const photos = GalleryStore.getAll();
      const editingId = gFields.id.value;
      const status = GalleryStore.getStatus();

      gList.textContent = '';
      if (status === 'error') {
        const err = document.createElement('p');
        err.className = 'no-result';
        err.textContent = 'Unable to load the gallery right now.';
        gList.appendChild(err);
        return;
      }
      if (status === 'loading') {
        const loading = document.createElement('p');
        loading.className = 'no-result';
        loading.textContent = 'Loading gallery\u2026';
        gList.appendChild(loading);
        return;
      }
      if (photos.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'no-result';
        empty.textContent = 'No images yet. Add your first one with the form.';
        gList.appendChild(empty);
        return;
      }

      photos.forEach(photo => {
        const item = document.createElement('div');
        item.className = 'admin-item' + (photo.id === editingId ? ' editing' : '');
        item.dataset.id = photo.id;

        // thumbnail (falls back to a placeholder box for broken URLs)
        const thumbBox = document.createElement('span');
        thumbBox.className = 'admin-thumb-box';
        const thumb = document.createElement('img');
        thumb.className = 'admin-thumb';
        thumb.loading = 'lazy';
        thumb.alt = '';
        thumb.src = photo.imageUrl;
        thumb.addEventListener('error', () => {
          thumb.remove();
          thumbBox.textContent = '\u{1F5BC}\uFE0F';
        });
        thumbBox.appendChild(thumb);

        const info = document.createElement('div');
        info.className = 'admin-item-info';

        const titleEl = document.createElement('strong');
        titleEl.textContent = photo.title || '(untitled image)';
        info.appendChild(titleEl);

        const metaBits = [];
        metaBits.push(photo.order === null ? 'No order' : 'Order ' + photo.order);
        if (photo.category) metaBits.push(photo.category.charAt(0).toUpperCase() + photo.category.slice(1));
        if (photo.storagePath) metaBits.push('Uploaded');
        const metaEl = document.createElement('span');
        metaEl.className = 'admin-item-date';
        metaEl.textContent = metaBits.join(' \u00b7 ');
        info.appendChild(metaEl);

        const urlEl = document.createElement('span');
        urlEl.className = 'admin-item-url';
        urlEl.textContent = photo.imageUrl;
        urlEl.title = photo.imageUrl;
        info.appendChild(urlEl);

        const actions = document.createElement('div');
        actions.className = 'admin-item-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'admin-btn edit';
        editBtn.textContent = 'Edit';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'admin-btn delete';
        deleteBtn.textContent = 'Delete';
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(thumbBox);
        item.appendChild(info);
        item.appendChild(actions);
        gList.appendChild(item);
      });
    }

    renderGalleryAdminList();
    resetGalleryForm();
    GalleryStore.onChange(renderGalleryAdminList);
  }

});
