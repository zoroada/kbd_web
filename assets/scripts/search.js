// Client-side search index builder and ranking helpers.

// Pages fetched when no embedded index exists.
const pagesToIndex = [
  'index.html',
  'index-en.html',
  'keyboard/zh/keyboard.html',
  'keyboard/en/keyboard-en.html',
  'keyboard/zh/tumblor40.html',
  'keyboard/en/tumblor40-en.html',
  'keyboard/zh/orbit65.html',
  'keyboard/en/orbit65-en.html',
  'keyboard/zh/aurora-alice-ec.html',
  'keyboard/en/aurora-alice-ec-en.html',
  'keyboard/zh/drift-pad.html',
  'keyboard/en/drift-pad-en.html',
  'pages/zh/guide.html',
  'pages/en/guide-en.html',
  'pages/zh/docs.html',
  'pages/en/docs-en.html',
  'pages/zh/features.html',
  'pages/en/features-en.html',
  'pages/zh/firmware.html',
  'pages/en/firmware-en.html',
];
const SEARCH_INDEX_SCRIPT_URL = 'assets/data/search-index.js';
let _cachedIndex = null;

function getEmbeddedSearchIndex() {
  if (Array.isArray(window.embeddedSearchIndex)) {
    return window.embeddedSearchIndex;
  }
  return null;
}

function reloadSearchIndexScript() {
  return new Promise((resolve, reject) => {
    const runtimeScriptId = 'search-index-runtime';
    const existing = document.getElementById(runtimeScriptId);
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = runtimeScriptId;
    script.async = true;
    script.src = `${SEARCH_INDEX_SCRIPT_URL}?t=${Date.now()}`;
    script.onload = () => resolve(getEmbeddedSearchIndex());
    script.onerror = () => reject(new Error('failed to load search-index.js'));
    document.head.appendChild(script);
  });
}

function normalizeForSearch(text) {
  const lowered = (text || '').toLowerCase();
  const normalized = typeof lowered.normalize === 'function'
    ? lowered.normalize('NFKC')
    : lowered;

  // Remove separators/punctuation so `打开vial` can match `打开 Vial`.
  return normalized.replace(/[\s\-_/.,，。!?！？:：;；"'`~!@#$%^&*()+=[\]{}<>《》（）()|\\]+/g, '');
}

function makeSnippet(text, needle) {
  const source = (text || '').replace(/\n+/g, ' ').trim();
  if (!source) return '';

  const q = (needle || '').toLowerCase();
  const idx = q ? source.toLowerCase().indexOf(q) : -1;

  if (idx < 0) {
    return source.length > 110 ? source.slice(0, 110) + '...' : source;
  }

  const start = Math.max(0, idx - 36);
  const length = Math.max(q.length, 18) + 84;
  const chunk = source.slice(start, start + length);
  const prefix = start > 0 ? '...' : '';
  const suffix = start + length < source.length ? '...' : '';
  return prefix + chunk + suffix;
}

function getDocSearchText(doc) {
  const bodyText = doc.body ? doc.body.innerText : '';
  const imageAltText = Array.from(doc.querySelectorAll('img[alt]'))
    .map(img => img.getAttribute('alt') || '')
    .join(' ');
  return `${bodyText} ${imageAltText}`.trim();
}

// Fetch each page and extract plain text, with simple caching.
// If `assets/data/search-index.js` exists, use it first for best compatibility on local file URLs.
async function buildIndex() {
  if (_cachedIndex) return _cachedIndex;

  let embeddedIndex = getEmbeddedSearchIndex();

  // Force a reload once when embedded index isn't available.
  if (!embeddedIndex) {
    try {
      embeddedIndex = await reloadSearchIndexScript();
    } catch (err) {
      console.warn('search index script reload failed:', err);
    }
  }

  if (embeddedIndex) {
    _cachedIndex = embeddedIndex.map(item => ({
      title: item.title || item.url,
      url: item.url,
      content: item.content || '',
    }));
    return _cachedIndex;
  }

  const index = [];
  for (const url of pagesToIndex) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const title = doc.title || url;
      const content = getDocSearchText(doc);
      index.push({ title, url, content });
    } catch (err) {
      console.error('failed to load', url, err);
    }
  }
  _cachedIndex = index;
  return index;
}

function searchIndex(index, query) {
  const q = (query || '').trim();
  const qLower = q.toLowerCase();
  const qNorm = normalizeForSearch(q);
  const tokens = qLower.split(/\s+/).filter(Boolean);

  if (!q) {
    // No query: show every page with leading snippet.
    return index.map(item => {
      const searchable = `${item.title || ''} ${item.content || ''}`.trim();
      return { ...item, snippet: makeSnippet(searchable, '') };
    });
  }

  return index
    .map(item => {
      const title = item.title || '';
      const content = item.content || '';
      const hayRaw = `${title} ${content}`.trim().toLowerCase();
      const hayNorm = normalizeForSearch(`${title} ${content}`);
      const titleRaw = title.toLowerCase();
      const titleNorm = normalizeForSearch(title);

      let score = 0;
      let matchedTokenCount = 0;
      let snippetNeedle = '';

      if (qLower && hayRaw.includes(qLower)) {
        score += 70;
        snippetNeedle = qLower;
      }
      if (qNorm && hayNorm.includes(qNorm)) score += 90;
      if (qLower && titleRaw.includes(qLower)) score += 120;
      if (qNorm && titleNorm.includes(qNorm)) score += 140;

      tokens.forEach(token => {
        const tokenNorm = normalizeForSearch(token);
        if (hayRaw.includes(token)) {
          score += 24;
          matchedTokenCount += 1;
          if (!snippetNeedle) snippetNeedle = token;
          return;
        }
        if (tokenNorm && hayNorm.includes(tokenNorm)) {
          score += 18;
          matchedTokenCount += 1;
          if (!snippetNeedle) snippetNeedle = token;
        }
      });

      if (tokens.length > 1 && matchedTokenCount === tokens.length) {
        score += 30;
      }

      // Require at least one meaningful hit.
      if (score <= 0) return null;

      const snippetBase = content || title;
      return {
        ...item,
        _score: score,
        snippet: makeSnippet(snippetBase, snippetNeedle || tokens[0] || qLower),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...rest }) => rest);
}
