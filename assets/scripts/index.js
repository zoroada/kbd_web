document.addEventListener('DOMContentLoaded', () => {
  const LANGUAGE_PAGE_MAP = {
    'index.html': { zh: 'index.html', en: 'index-en.html' },
    'index-en.html': { zh: 'index.html', en: 'index-en.html' },
    'guide.html': { zh: 'guide.html', en: '../en/guide-en.html' },
    'guide-en.html': { zh: '../zh/guide.html', en: 'guide-en.html' },
    'docs.html': { zh: 'docs.html', en: '../en/docs-en.html' },
    'docs-en.html': { zh: '../zh/docs.html', en: 'docs-en.html' },
    'features.html': { zh: 'features.html', en: '../en/features-en.html' },
    'features-en.html': { zh: '../zh/features.html', en: 'features-en.html' },
    'firmware.html': { zh: 'firmware.html', en: '../en/firmware-en.html' },
    'firmware-en.html': { zh: '../zh/firmware.html', en: 'firmware-en.html' },
    'keyboard.html': { zh: 'keyboard.html', en: '../en/keyboard-en.html' },
    'keyboard-en.html': { zh: '../zh/keyboard.html', en: 'keyboard-en.html' },
    'tumblor40.html': { zh: 'tumblor40.html', en: '../en/tumblor40-en.html' },
    'tumblor40-en.html': { zh: '../zh/tumblor40.html', en: 'tumblor40-en.html' },
    'orbit65.html': { zh: 'orbit65.html', en: '../en/orbit65-en.html' },
    'orbit65-en.html': { zh: '../zh/orbit65.html', en: 'orbit65-en.html' },
    'aurora-alice-ec.html': { zh: 'aurora-alice-ec.html', en: '../en/aurora-alice-ec-en.html' },
    'aurora-alice-ec-en.html': { zh: '../zh/aurora-alice-ec.html', en: 'aurora-alice-ec-en.html' },
    'drift-pad.html': { zh: 'drift-pad.html', en: '../en/drift-pad-en.html' },
    'drift-pad-en.html': { zh: '../zh/drift-pad.html', en: 'drift-pad-en.html' },
    'search.html': { zh: 'search.html', en: '../en/search-en.html' },
    'search-en.html': { zh: '../zh/search.html', en: 'search-en.html' },
  };

  const pageLocale = document.documentElement.lang && document.documentElement.lang.startsWith('en')
    ? 'en'
    : 'zh';
  window.siteLocale = pageLocale;

  const themeLabel = {
    zh: { light: '切换到日间模式', dark: '切换到夜间模式' },
    en: { light: 'Switch to light mode', dark: 'Switch to dark mode' },
  };

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('site-theme', theme);
    } catch (error) {
      console.warn('failed to persist theme:', error);
    }
    const button = document.querySelector('[data-theme-toggle]');
    if (!button) return;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    button.dataset.nextTheme = nextTheme;
    button.dataset.themeState = theme;
    button.setAttribute('aria-label', themeLabel[pageLocale][nextTheme]);
    button.setAttribute('title', themeLabel[pageLocale][nextTheme]);
    button.textContent = '';
  }

  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem('site-theme') || savedTheme;
  } catch (error) {
    console.warn('failed to read theme preference:', error);
  }
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');

  const themeToggle = document.querySelector('[data-theme-toggle]');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = themeToggle.dataset.nextTheme === 'dark' ? 'dark' : 'light';
      applyTheme(nextTheme);
    });
  }

  // Highlight current page in top nav.
  let page = location.pathname.split('/').pop();
  if (!page) page = 'index.html';

  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http')) return;
    if (href === page) {
      link.classList.add('active');
    }
  });

  const langSwitch = document.querySelector('[data-lang-switch]');
  if (langSwitch) {
    const mappedPages = LANGUAGE_PAGE_MAP[page] || LANGUAGE_PAGE_MAP['index.html'];
    const targetLocale = pageLocale === 'zh' ? 'en' : 'zh';
    const targetPage = mappedPages[targetLocale];
    const nextLabel = targetLocale === 'zh' ? '中文' : 'EN';
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query && page.startsWith('search')) {
      langSwitch.href = `${targetPage}?q=${encodeURIComponent(query)}`;
    } else {
      langSwitch.href = targetPage;
    }
    langSwitch.textContent = nextLabel;
  }

  // Vial tutorial page: side navigation smooth scroll + active section tracking.
  const tocLinks = Array.from(document.querySelectorAll('.sidebar a[href^="#"]'));
  if (!tocLinks.length) return;
  const SECTION_SCROLL_DURATION_MS = 170;

  const sections = tocLinks
    .map(link => {
      const href = link.getAttribute('href');
      const id = href ? decodeURIComponent(href.slice(1)) : '';
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (!sections.length) return;

  function setActive(id) {
    tocLinks.forEach(link => {
      const href = link.getAttribute('href');
      const active = href && decodeURIComponent(href.slice(1)) === id;
      link.classList.toggle('active', Boolean(active));
    });
  }

  function getScrollAnchorOffset() {
    const navbar = document.querySelector('.navbar');
    const navHeight = navbar ? navbar.getBoundingClientRect().height : 64;
    const mobileExtra = window.matchMedia('(max-width: 980px)').matches ? 72 : 48;
    return navHeight + mobileExtra;
  }

  function getCurrentSectionId() {
    const scrollY = window.scrollY;
    const offset = getScrollAnchorOffset();
    const doc = document.documentElement;
    const maxScrollY = Math.max(0, doc.scrollHeight - window.innerHeight);
    let currentId = sections[0].id;

    sections.forEach(section => {
      // Clamp each section start into scrollable range so the last section
      // can still become active near page bottom.
      const sectionStart = Math.min(Math.max(0, section.offsetTop - offset), maxScrollY);
      if (scrollY + 1 >= sectionStart) {
        currentId = section.id;
      }
    });

    return currentId;
  }

  let rafId = null;
  function syncActiveFromScroll() {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      setActive(getCurrentSectionId());
    });
  }

  function scrollToSection(section) {
    const targetTop = Math.max(
      0,
      window.scrollY + section.getBoundingClientRect().top - getScrollAnchorOffset() + 8
    );

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      window.scrollTo(0, targetTop);
      return;
    }

    const startTop = window.scrollY;
    const delta = targetTop - startTop;
    if (Math.abs(delta) < 1) return;

    const startTime = performance.now();
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / SECTION_SCROLL_DURATION_MS);
      const eased = easeOutCubic(progress);
      window.scrollTo(0, startTop + delta * eased);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }

  tocLinks.forEach(link => {
    link.addEventListener('click', event => {
      const href = link.getAttribute('href');
      const id = href ? decodeURIComponent(href.slice(1)) : '';
      const section = document.getElementById(id);
      if (!section) return;

      event.preventDefault();
      scrollToSection(section);
      history.replaceState(null, '', `#${section.id}`);
      setActive(section.id);
    });
  });

  window.addEventListener('scroll', syncActiveFromScroll, { passive: true });
  window.addEventListener('resize', syncActiveFromScroll);

  const initialHashId = decodeURIComponent(location.hash.replace('#', ''));
  if (initialHashId) {
    const initialSection = sections.find(section => section.id === initialHashId);
    if (initialSection) {
      setActive(initialSection.id);
      window.setTimeout(() => {
        scrollToSection(initialSection);
      }, 0);
      return;
    }
  }

  setActive(getCurrentSectionId());
});
