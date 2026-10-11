(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Mobile menu
  const burger = $('.burger'), menu = $('#menu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });
  }

  // Hero slider
  const hero = $('.hero');
  if (hero) {
    const slides = $$('.slide', hero), dots = $$('.dots button', hero);
    let i = 0, timer;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('on', k === i));
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
    };
    const start = () => { stop(); if (slides.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(i + 1), 6000); };
    const stop = () => clearInterval(timer);
    $('.prev', hero)?.addEventListener('click', () => { go(i - 1); start(); });
    $('.next', hero)?.addEventListener('click', () => { go(i + 1); start(); });
    dots.forEach((d, k) => d.addEventListener('click', () => { go(k); start(); }));
    hero.addEventListener('mouseenter', stop); hero.addEventListener('mouseleave', start);
    start();
  }

  // Gallery: filter + lightbox
  const items = $$('.gal-item');
  if (items.length) {
    $$('.chip').forEach((c) => c.addEventListener('click', () => {
      $$('.chip').forEach((x) => x.classList.toggle('on', x === c));
      const f = c.dataset.f;
      items.forEach((it) => { it.hidden = !(f === 'all' || it.dataset.cat === f); });
    }));
    const lb = $('.lightbox'), img = $('img', lb), cap = $('figcaption', lb);
    let idx = 0, list = [];
    const show = (n) => {
      idx = (n + list.length) % list.length;
      img.src = list[idx].href; img.alt = list[idx].dataset.cap || '';
      cap.textContent = list[idx].dataset.cap || '';
    };
    const close = () => { lb.hidden = true; document.body.style.overflow = ''; };
    items.forEach((it) => it.addEventListener('click', (e) => {
      e.preventDefault();
      list = items.filter((x) => !x.hidden);
      lb.hidden = false; document.body.style.overflow = 'hidden';
      show(list.indexOf(it)); $('.lb-close', lb).focus();
    }));
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', () => show(idx - 1));
    $('.lb-next', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  // Enquiry form
  const form = $('#inquiry-form');
  if (form) {
    const msg = $('.form-msg', form), btn = $('button[type=submit]', form);
    const typeSel = form.elements.type, classLbl = $('[data-show=admission]', form);
    const sync = () => { classLbl.style.display = typeSel.value === 'admission' ? '' : 'none'; };
    typeSel.addEventListener('change', sync); sync();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'form-msg'; msg.textContent = '';
      const data = Object.fromEntries(new FormData(form));
      if (!data.name.trim()) { msg.className = 'form-msg err'; msg.textContent = 'Please enter your name.'; form.elements.name.focus(); return; }
      if (!/^[\d+\-\s()]{7,20}$/.test(data.phone.trim())) { msg.className = 'form-msg err'; msg.textContent = 'Please enter a valid phone number.'; form.elements.phone.focus(); return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      try {
        const r = await fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }, body: JSON.stringify(data) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Something went wrong.');
        form.reset(); sync();
        msg.className = 'form-msg ok'; msg.textContent = 'Thank you! We have received your enquiry and will contact you soon.';
      } catch (err) {
        msg.className = 'form-msg err'; msg.textContent = err.message;
      } finally { btn.disabled = false; btn.textContent = 'Send Enquiry'; }
    });
  }
})();
