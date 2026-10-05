'use strict';
(() => {
  const stateKey = 'mava-demo-portable-data-v1';
  const sessionKey = 'mava-demo-portable-session-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  let memory = null;
  let loggedIn = false;
  const failure = (message, status = 400) => Object.assign(new Error(message), {status});
  const baseline = Promise.resolve(window.MAVA_DEMO_DATA);
  // The demo contains only the supplied sample catalogue. No production API is used.
  async function read() {
    const original = await baseline;
    try {
      const saved = JSON.parse(localStorage.getItem(stateKey) || 'null');
      if (saved && Array.isArray(saved.drinks) && Array.isArray(saved.branches) && saved.settings) return clone(saved);
    } catch {}
    return clone(memory || original);
  }
  function save(value) {
    try { localStorage.setItem(stateKey, JSON.stringify(value)); }
    catch (error) {
      if (error.name === 'QuotaExceededError') throw failure('В браузере закончилось место. Выбери фото поменьше или сбрось демо.');
      throw failure('Браузер запрещает сохранять изменения. Разреши хранение данных для этой страницы.');
    }
    memory = clone(value);
  }
  function authorized() {
    try { loggedIn = sessionStorage.getItem(sessionKey) === '1'; } catch {}
    if (!loggedIn) throw failure('Открой демоадминку, чтобы попробовать редактирование.', 401);
  }
  function session(value) {
    loggedIn = value;
    try { if (value) sessionStorage.setItem(sessionKey, '1'); else sessionStorage.removeItem(sessionKey); } catch {}
  }
  function website(value, optional = true) {
    if (!value && optional) return '';
    let url;
    try { url = new URL(value); } catch { throw failure('Укажи полную ссылку, начинающуюся с https://'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw failure('Используй ссылку на сайт с https://');
    return url.href;
  }
  function imagePath(value) {
    if (!value || value.startsWith('/assets/') || /^data:image\/(jpeg|png|webp);base64,/.test(value)) return value || '';
    throw failure('Выбери фотографию с устройства.');
  }
  function normalizeDrink(input) {
    if (!input.name?.trim()) throw failure('Напиши название напитка.');
    if (!Object.hasOwn(Mava.categories, input.category)) throw failure('Выбери категорию.');
    if (!Array.isArray(input.variants) || input.variants.length < 1 || input.variants.length > 6) throw failure('Добавь от 1 до 6 вариантов объёма.');
    const variants = input.variants.map((v, i) => {
      const price = Number(v.price);
      if (!v.label?.trim() || !Number.isFinite(price) || price < 0 || price > 10000) throw failure('Проверь объём и цену напитка.');
      return {id: String(v.id || 'v' + i), label: v.label.trim(), price};
    });
    return {...input, name: input.name.trim(), variants, price: Math.min(...variants.map(v => v.price)),
      temperatures: (input.temperatures || []).filter(t => ['cold', 'hot'].includes(t)),
      available: !!input.available, position: Number(input.position) || 0, image: imagePath(input.image)};
  }
  function normalizeBranch(input) {
    if (!input.name?.trim() || !input.address?.trim()) throw failure('Заполни название и адрес точки.');
    return {...input, name: input.name.trim(), address: input.address.trim(), available: !!input.available,
      position: Number(input.position) || 0, image: imagePath(input.image), map_url: website(input.map_url)};
  }
  function currentRevision(record, body) {
    if (Number(body.revision) !== Number(record.revision)) throw failure('Запись изменена в другой вкладке. Обнови страницу.', 409);
  }
  Mava.api = async (path, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    if (path === '/api/login' && method === 'POST') { session(true); return {csrf: 'demo-local-only'}; }
    if (path === '/api/logout' && method === 'POST') { session(false); return {ok: true}; }
    if (path === '/api/session' && method === 'GET') { authorized(); return {csrf: 'demo-local-only'}; }
    if ((path === '/api/orders' || path === '/api/quote') && method === 'POST') throw failure('Заказ оформляется в ZaZa. Демо не отправляет заявки.', 409);
    const state = await read();
    if (path === '/api/menu' && method === 'GET') {
      return {...state, drinks: state.drinks.filter(d => d.available), branches: state.branches.filter(b => b.available)};
    }
    authorized();
    if (path === '/api/admin/menu' && method === 'GET') return state;
    if (path === '/api/orders' && method === 'GET') return {orders: []};
    if (path === '/api/upload' && method === 'POST') {
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(body.data || '')) throw failure('Выбери JPG, PNG или WebP.');
      if (body.data.length > 4 * 1024 * 1024) throw failure('Для демоверсии выбери фотографию поменьше.');
      return {image: body.data};
    }
    if (path === '/api/settings' && method === 'PUT') {
      currentRevision(state.settings, body);
      const socials = (body.socials || []).map(s => ({label: s.label, url: website(s.url, false)}));
      state.settings = {...state.settings, ...body, socials, delivery_url: website(body.delivery_url, false),
        demo: !!body.demo, revision: state.settings.revision + 1,
        ordering_enabled: false, pickup_enabled: false, delivery_enabled: false, zaza_enabled: false};
      save(state);
      return {settings: clone(state.settings)};
    }
    const match = /^\/api\/(drinks|branches)(?:\/(\d+))?$/.exec(path);
    if (match) {
      const key = match[1], id = Number(match[2]), singular = key === 'drinks' ? 'drink' : 'branch';
      const index = state[key].findIndex(item => item.id === id);
      if (match[2] && index < 0) throw failure('Эта запись уже удалена.', 404);
      if (method === 'DELETE' && match[2]) {
        currentRevision(state[key][index], body);
        state[key].splice(index, 1); save(state); return {ok: true};
      }
      if ((method === 'POST' && !match[2]) || (method === 'PUT' && match[2])) {
        const previous = match[2] ? state[key][index] : null;
        if (previous) currentRevision(previous, body);
        const value = (key === 'drinks' ? normalizeDrink : normalizeBranch)(body);
        const record = {...previous, ...value, id: previous?.id || Math.max(0, ...state[key].map(x => x.id)) + 1,
          revision: (previous?.revision || 0) + 1};
        if (previous) state[key][index] = record; else state[key].push(record);
        state[key].sort((a, b) => a.position - b.position || a.id - b.id);
        save(state); return {[singular]: clone(record)};
      }
    }
    throw failure('Это действие недоступно в демоверсии.', 404);
  };
  document.querySelector('#demo-reset')?.addEventListener('click', () => {
    if (!confirm('Вернуть исходные напитки, цены и точки в этой демоверсии?')) return;
    try { localStorage.removeItem(stateKey); localStorage.removeItem('mava-cart-v11'); }
    catch { Mava.toast('Не удалось сбросить данные. Проверь настройки браузера.'); return; }
    memory = null;
    location.reload();
  });
})();
