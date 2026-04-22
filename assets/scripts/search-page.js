document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const resultsContainer = document.getElementById('results');
  const pageLocale = window.siteLocale || (document.documentElement.lang.startsWith('en') ? 'en' : 'zh');
  const copy = {
    zh: {
      empty: '未找到匹配结果。',
      loadFailed: '搜索索引未加载成功，请运行 python3 scripts/build_index.py 后刷新页面。',
      reloadFailed: '搜索索引加载异常，请刷新页面后重试。',
      listAll: '全部文档',
    },
    en: {
      empty: 'No matching results found.',
      loadFailed: 'Search index failed to load. Run python3 scripts/build_index.py and refresh the page.',
      reloadFailed: 'Search index failed to load. Please refresh and try again.',
      listAll: 'All documents',
    },
  }[pageLocale];

  function getResultHref(url) {
    if (!url || /^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('#')) {
      return url || '#';
    }

    const siteRootUrl = new URL('../../', location.href);
    return new URL(url.replace(/^\.?\//, ''), siteRootUrl).href;
  }

  function renderResults(matches) {
    if (!matches || matches.length === 0) {
      resultsContainer.innerHTML = `<p>${copy.empty}</p>`;
      return;
    }
    resultsContainer.innerHTML = '';
    matches.forEach(item => {
      const div = document.createElement('div');
      div.className = 'search-result';
      const a = document.createElement('a');
      a.href = getResultHref(item.url);
      a.textContent = item.title;
      const p = document.createElement('p');
      p.textContent = item.snippet || copy.listAll;
      div.appendChild(a);
      div.appendChild(p);
      resultsContainer.appendChild(div);
    });
  }

  function renderIndexError(message) {
    resultsContainer.innerHTML = `<p>${message}</p>`;
  }

  async function runSearch(query, shouldUpdateUrl) {
    try {
      const index = await buildIndex();
      if (!index || index.length === 0) {
        renderIndexError(copy.loadFailed);
        return;
      }
      const matches = searchIndex(index, query);
      renderResults(matches);
      if (!shouldUpdateUrl) return;
      const nextPage = pageLocale === 'en' ? 'search-en.html' : 'search.html';
      const nextUrl = query
        ? `${nextPage}?q=${encodeURIComponent(query)}`
        : nextPage;
      history.replaceState(null, '', nextUrl);
    } catch (error) {
      renderIndexError(copy.reloadFailed);
      console.error('search submit failed:', error);
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const query = input.value.trim();
    await runSearch(query, true);
  });

  const params = new URLSearchParams(location.search);
  const query = params.get('q') || '';
  if (query) {
    input.value = query;
  }
  runSearch(query, false);
});
