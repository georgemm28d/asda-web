(() => {
  'use strict';
  const body = document.body;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* Loader ------------------------------------------------- */
  const loader = $('#loader');
  let loaded = false;
  const revealSite = () => {
    if (loaded) return;
    loaded = true;
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    window.setTimeout(() => { if (loader) loader.style.display = 'none'; }, reduce ? 30 : 1000);
  };
  window.addEventListener('load', () => window.setTimeout(revealSite, reduce ? 0 : 420), { once: true });
  window.setTimeout(revealSite, 3200);

  /* Scroll progress + nav state ---------------------------- */
  const nav = $('#nav');
  const progress = $('#progressBar');
  let rafScroll = null;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    if (progress) progress.style.transform = `scaleX(${value})`;
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 30);
    rafScroll = null;
  };
  window.addEventListener('scroll', () => {
    if (rafScroll === null) rafScroll = window.requestAnimationFrame(updateScroll);
  }, { passive: true });
  updateScroll();

  /* Scroll reveals (geométrico: IO no dispara con clip-path 100%) - */
  const revealTargets = $$('[data-reveal], .reveal-img, .process');
  let revealFrame = null;
  let revealExhausted = false;
  const updateReveals = () => {
    revealFrame = null;
    if (revealExhausted) return;
    const vh = window.innerHeight;
    let remaining = 0;
    revealTargets.forEach((el) => {
      if (el.classList.contains('is-in')) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.92 && rect.bottom > -40) {
        el.classList.add('is-in');
      } else {
        remaining += 1;
      }
    });
    if (!remaining) revealExhausted = true;
  };
  const requestRevealCheck = () => {
    if (revealFrame === null) revealFrame = window.requestAnimationFrame(updateReveals);
  };
  if (reduce) {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  } else {
    window.addEventListener('scroll', requestRevealCheck, { passive: true });
    window.addEventListener('resize', requestRevealCheck);
    window.addEventListener('load', requestRevealCheck, { once: true });
    requestRevealCheck();
  }

  /* Active nav link ---------------------------------------- */
  const navLinks = $$('.nav__links a');
  if ('IntersectionObserver' in window && navLinks.length) {
    const map = new Map();
    navLinks.forEach((link) => {
      const section = $(link.getAttribute('href'));
      if (section) map.set(section, link);
    });
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((l) => {
          l.classList.remove('is-active');
          l.removeAttribute('aria-current');
        });
        const link = map.get(entry.target);
        if (link) {
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-42% 0px -52% 0px' });
    map.forEach((link, section) => spy.observe(section));
  }

  /* Counters ----------------------------------------------- */
  const counters = $$('[data-count]');
  const numberFormat = new Intl.NumberFormat('es-VE');
  const renderCount = (el, value) => {
    const pad = Number(el.dataset.pad || 0);
    el.textContent = pad ? String(Math.round(value)).padStart(pad, '0') : numberFormat.format(Math.round(value));
  };
  const animateCount = (el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = Number(el.dataset.count || 0);
    if (reduce) { renderCount(el, target); return; }
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const progressValue = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progressValue, 4);
      renderCount(el, target * eased);
      if (progressValue < 1) window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  };
  if (counters.length) {
    if (reduce) {
      counters.forEach((el) => renderCount(el, Number(el.dataset.count || 0)));
    } else {
      if ('IntersectionObserver' in window) {
        const countObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              countObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.65 });
        counters.forEach((el) => countObserver.observe(el));
      } else {
        counters.forEach((el) => renderCount(el, Number(el.dataset.count || 0)));
      }
    }
  }

  /* Mobile menu -------------------------------------------- */
  const burger = $('#burger');
  const menu = $('#menu');
  const setMenu = (open) => {
    if (!burger || !menu) return;
    body.classList.toggle('is-locked', open);
    menu.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));
    $$('main, footer').forEach((el) => el.toggleAttribute('inert', open));
    if (open) {
      const first = $('a', menu);
      if (first) window.setTimeout(() => first.focus(), 60);
    }
  };
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const wasOpen = menu.classList.contains('is-open');
      setMenu(!wasOpen);
      if (wasOpen) burger.focus();
    });
    $$('a', menu).forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });
    const wide = window.matchMedia('(min-width: 941px)');
    if (wide.addEventListener) {
      wide.addEventListener('change', (event) => { if (event.matches) setMenu(false); });
    }
  }

  /* Product -> quote select -------------------------------- */
  const productSelect = $('#q-product');
  $$('[data-quote]').forEach((link) => {
    link.addEventListener('click', () => {
      if (!productSelect) return;
      productSelect.value = link.dataset.quote;
      const wrap = productSelect.closest('.field');
      if (wrap) wrap.classList.remove('is-invalid');
    });
  });

  /* Quantity stepper --------------------------------------- */
  const qtyInput = $('#q-qty');
  $$('.qty button').forEach((button) => {
    button.addEventListener('click', () => {
      if (!qtyInput) return;
      const next = Math.min(500, Math.max(1, (Number(qtyInput.value) || 1) + Number(button.dataset.step)));
      qtyInput.value = String(next);
      qtyInput.closest('.field').classList.remove('is-invalid');
    });
  });

  /* Quote form --------------------------------------------- */
  const form = $('#quoteForm');
  const status = $('#formStatus');
  if (form) {
    const nameEl = $('#q-name');
    const phoneEl = $('#q-phone');
    const cityEl = $('#q-city');
    const presentEl = $('#q-presentation');
    const notesEl = $('#q-notes');
    const rules = [
      { el: nameEl, msg: 'Escribe tu nombre completo.', test: (v) => v.trim().length >= 2 },
      { el: phoneEl, msg: 'Incluye un teléfono válido. Ej. 0414 123 4567.', test: (v) => v.replace(/\D/g, '').length >= 10 },
      { el: cityEl, msg: 'Indica la ciudad donde está la obra.', test: (v) => v.trim().length >= 2 },
      { el: productSelect, msg: 'Selecciona el material que necesitas.', test: (v) => v !== '' },
      { el: qtyInput, msg: 'Indica una cantidad entre 1 y 500 m³.', test: (v) => Number(v) >= 1 && Number(v) <= 500 }
    ];
    const setError = (field, msg) => {
      if (!field) return;
      const wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.add('is-invalid');
      const err = wrap.querySelector('.field__err');
      if (err) err.textContent = msg;
      field.setAttribute('aria-invalid', 'true');
    };
    const clearError = (field) => {
      if (!field) return;
      const wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
    };
    rules.forEach((rule) => {
      if (!rule.el) return;
      const eventName = rule.el.tagName === 'SELECT' ? 'change' : 'input';
      rule.el.addEventListener(eventName, () => {
        if (rule.test(rule.el.value)) clearError(rule.el);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (status) status.textContent = '';
      rules.forEach((rule) => clearError(rule.el));
      const errors = rules.filter((rule) => !rule.el || !rule.test(rule.el.value));
      if (errors.length) {
        errors.forEach((rule) => setError(rule.el, rule.msg));
        if (errors[0].el) errors[0].el.focus({ preventScroll: false });
        if (status) status.textContent = 'Revisa los campos marcados para continuar.';
        return;
      }

      const chosen = productSelect.options[productSelect.selectedIndex];
      const lines = [
        'Hola ASDA, quiero cotizar:',
        '',
        `• Material: ${chosen ? chosen.text : 'A convenir'}`,
        `• Cantidad: ${qtyInput.value} m³`,
        `• Ciudad: ${cityEl.value.trim()}`,
        `• Presentación: ${presentEl ? presentEl.value : 'A convenir'}`,
        `• Nombre: ${nameEl.value.trim()}`,
        `• Teléfono: ${phoneEl.value.trim()}`
      ];
      if (notesEl && notesEl.value.trim()) lines.push(`• Nota: ${notesEl.value.trim()}`);
      const url = 'https://wa.me/584141234567?text=' + encodeURIComponent(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
      if (status) {
        status.textContent = 'Solicitud lista. Si WhatsApp no se abrió, toca este enlace: ';
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'wa.me/584141234567';
        status.appendChild(link);
      }
    });
  }

  /* Accordion ---------------------------------------------- */
  const triggers = $$('.acc__trigger');
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.acc__item');
      const wasOpen = item.classList.contains('is-open');
      $$('.acc__item').forEach((other) => {
        other.classList.remove('is-open');
        const btn = $('.acc__trigger', other);
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* Live clock (Caracas) ----------------------------------- */
  const clock = $('#clock');
  if (clock) {
    const timeFormat = new Intl.DateTimeFormat('es-VE', {
      timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', hour12: false
    });
    const updateClock = () => { clock.textContent = timeFormat.format(new Date()); };
    updateClock();
    window.setInterval(updateClock, 30000);
  }

  /* Year --------------------------------------------------- */
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
