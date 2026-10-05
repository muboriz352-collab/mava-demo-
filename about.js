'use strict';
(() => {
  // Keep links from earlier versions of the menu and cart working.
  if (['#menu', '#cart', '#locations'].includes(location.hash)) {
    location.replace(Mava.url('/menu') + location.search + location.hash);
    return;
  }
  const {el, api} = Mava;
  const $ = selector => document.querySelector(selector);
  $('#year').textContent = new Date().getFullYear();
  try {
    const cart = JSON.parse(localStorage.getItem('mava-cart-v11') || '[]');
    if (Array.isArray(cart)) $('#about-cart-count').textContent = cart.reduce((n, x) => n + (Number.isInteger(x?.quantity) && x.quantity > 0 && x.quantity <= 30 ? x.quantity : 0), 0);
  } catch {}

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const art = $('.story-art');
  let artVisible = true;
  const syncMotion = () => art.classList.toggle('motion-paused', document.hidden || !artVisible || reduced.matches);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('shown');
        observer.unobserve(entry.target);
      }
    }, {threshold: 0.08});
    if (!reduced.matches) document.querySelectorAll('[data-reveal]').forEach(node => { node.classList.add('will-reveal'); observer.observe(node); });
    new IntersectionObserver(([entry]) => {artVisible = entry.isIntersecting; syncMotion();}).observe(art);
  }
  document.addEventListener('visibilitychange', syncMotion);
  reduced.addEventListener('change', syncMotion);
  syncMotion();

  async function loadPlaces() {
    try {
      const data = await api('/api/menu');
      $('#about-branches').replaceChildren(...data.branches.map((branch, index) =>
        el('article', {class: 'place-card'},
          el('div', {class: 'place-number'}, String(index + 1).padStart(2, '0'), el('span', {'aria-hidden': 'true'}, '↗')),
          el('h3', {}, branch.name), el('p', {class: 'place-address'}, branch.address),
          el('p', {class: 'place-hours'}, branch.hours || 'График уточняется'),
          branch.subtitle ? el('p', {}, branch.subtitle) : null,
          el('div', {class: 'place-links'}, branch.map_url ? el('a', {href: branch.map_url, target: '_blank', rel: 'noopener noreferrer'}, 'Построить маршрут ↗') : null,
            branch.phone ? el('a', {href: 'tel:' + branch.phone.replace(/[^+0-9]/g, '')}, branch.phone) : null))));
      if (!data.branches.length) $('#about-branches').append(el('p', {}, 'Адреса скоро появятся здесь.'));
      const socials = data.settings.socials || [];
      $('#about-socials').replaceChildren(...socials.map(s => el('a', {href: s.url, target: '_blank', rel: 'noopener noreferrer'}, s.label + ' ↗')), el('a', {href: '/menu#menu'}, 'Меню ↗'));
      const contact = socials.find(s => /instagram/i.test(s.label))?.url || data.settings.instagram_url;
      if (contact) $('#franchise-contact').href = contact;
    } catch {
      $('#about-branches').replaceChildren(el('p', {}, 'Не удалось загрузить адреса. Проверь подключение.'), el('button', {class: 'pill outline', onclick: loadPlaces}, 'Повторить'));
    }
  }
  loadPlaces();
})();
