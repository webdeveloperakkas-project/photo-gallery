
(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }

  const track = document.getElementById('listing-track');
  const prev = document.getElementById('slide-prev');
  const next = document.getElementById('slide-next');
  let slideIndex = 0;
  const visibleCards = () => [...document.querySelectorAll('.listing-card:not(.is-hidden)')];
  function moveSlider(direction) {
    const cards = visibleCards();
    if (!track || !cards.length) return;
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    const perView = window.innerWidth <= 700 ? 1 : 3;
    const maxIndex = Math.max(0, cards.length - perView);
    slideIndex = Math.max(0, Math.min(maxIndex, slideIndex + direction));
    track.style.transform = `translateX(-${slideIndex * (cardWidth + gap)}px)`;
    if (prev) prev.disabled = slideIndex === 0;
    if (next) next.disabled = slideIndex === maxIndex;
  }
  prev?.addEventListener('click', () => moveSlider(-1));
  next?.addEventListener('click', () => moveSlider(1));
  window.addEventListener('resize', () => { slideIndex = 0; if (track) track.style.transform = 'translateX(0)'; moveSlider(0); });

  document.querySelectorAll('.filter-chip').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      const category = button.dataset.filter;
      document.querySelectorAll('.listing-card').forEach(card => {
        card.classList.toggle('is-hidden', category !== 'All' && card.dataset.category !== category);
      });
      slideIndex = 0;
      if (track) track.style.transform = 'translateX(0)';
      moveSlider(0);
    });
  });

  document.querySelectorAll('.category-card').forEach(link => {
    link.addEventListener('click', () => {
      const category = link.dataset.category;
      const filter = [...document.querySelectorAll('.filter-chip')].find(button => button.dataset.filter === category);
      if (filter) filter.click();
      else document.querySelector('[data-filter="All"]')?.click();
    });
  });

  document.querySelectorAll('.save-button').forEach(button => {
    button.addEventListener('click', () => {
      const saved = button.classList.toggle('saved');
      button.textContent = saved ? '♥' : '♡';
      button.setAttribute('aria-label', saved ? 'Remove saved example' : 'Save example');
    });
  });

  document.getElementById('hero-search')?.addEventListener('submit', event => {
    event.preventDefault();
    const query = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
    const match = [...document.querySelectorAll('.filter-chip')].find(button =>
      button.dataset.filter !== 'All' && query.includes(button.dataset.filter.toLowerCase())
    );
    (match || document.querySelector('[data-filter="All"]'))?.click();
    document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' });
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  moveSlider(0);
})();
