/**
 * Im Brüel – gemeinsame Interaktionen für beide Home-Prototypen
 * Abhängigkeiten: gsap, gsap-scrolltrigger
 *
 * Deklarativ über data-Attribute, damit Redaktion/Theme nur Markup setzen:
 *   [data-ib-reveal]          einzelnes Element einblenden ("" | "scale" | "fade")
 *   [data-ib-stagger]         Gruppe, deren [data-ib-item] gestaffelt erscheinen
 *   [data-ib-hover]           Karte hebt sich beim Hover (GSAP-Timeline)
 *   [data-ib-parallax]        Bild bewegt sich innerhalb seines Rahmens
 *   [data-count]              Zahl zählt hoch, sobald sichtbar
 *   [data-ib-slider]          Scroll-Snap-Slider mit Pfeilen + Punkten
 *
 * Animiert werden nur transform und opacity. Bei prefers-reduced-motion
 * bleibt alles sichtbar und statisch; Slider funktionieren weiterhin.
 */
(function () {
  'use strict';

  var REDUCE = '(prefers-reduced-motion: reduce)';

  /* ------------------------------------------------------------------ */
  /* Slider (funktioniert auch ohne GSAP – native Scroll-Snap)           */
  /* ------------------------------------------------------------------ */
  function initSlider(root) {
    var viewport = root.querySelector('[data-slider-viewport]');
    if (!viewport) return;

    var items = Array.prototype.slice.call(viewport.children);
    var prev = root.querySelector('[data-slider-prev]');
    var next = root.querySelector('[data-slider-next]');
    var dotsWrap = root.querySelector('[data-slider-dots]');
    var dots = [];
    var current = 0;

    viewport.style.position = 'relative';

    if (dotsWrap) {
      items.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'ib-slider__dot';
        dot.setAttribute('aria-label', 'Zu Element ' + (i + 1) + ' von ' + items.length);
        dot.addEventListener('click', function () { goTo(i); });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
    }

    function maxScroll() {
      return viewport.scrollWidth - viewport.clientWidth;
    }

    function goTo(i) {
      i = Math.max(0, Math.min(items.length - 1, i));
      var left = Math.min(items[i].offsetLeft - items[0].offsetLeft, maxScroll());
      viewport.scrollTo({ left: left, behavior: matchMedia(REDUCE).matches ? 'auto' : 'smooth' });
    }

    function update() {
      var x = viewport.scrollLeft;
      if (x >= maxScroll() - 4) {
        current = items.length - 1;
      } else {
        var best = 0;
        var bestDist = Infinity;
        items.forEach(function (item, i) {
          var d = Math.abs(item.offsetLeft - items[0].offsetLeft - x);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        current = best;
      }
      dots.forEach(function (d, i) {
        if (i === current) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
      if (prev) prev.disabled = x <= 4;
      if (next) next.disabled = x >= maxScroll() - 4;
    }

    if (prev) prev.addEventListener('click', function () { goTo(current - 1); });
    if (next) next.addEventListener('click', function () { goTo(current + 1); });

    var ticking = false;
    viewport.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', update);

    // Tastatur: Pfeiltasten im fokussierten Slider
    viewport.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
    });

    update();
  }

  /* ------------------------------------------------------------------ */
  /* Hover-Timeline für Karten                                            */
  /* ------------------------------------------------------------------ */
  function createHover(card) {
    var arrow = card.querySelector('[data-hover-arrow]');
    var tl = gsap.timeline({ paused: true, defaults: { duration: 0.45, ease: 'power3.out' } });
    tl.to(card, { y: -6 }, 0);
    if (arrow) tl.to(arrow, { x: 6, ease: 'back.out(3)' }, 0);

    function enter() { tl.timeScale(1).play(); }
    function leave() { tl.timeScale(1.4).reverse(); }
    function focusIn() { if (card.matches(':focus-visible')) enter(); }

    card.addEventListener('mouseenter', enter);
    card.addEventListener('mouseleave', leave);
    card.addEventListener('focus', focusIn);
    card.addEventListener('blur', leave);

    return function () {
      card.removeEventListener('mouseenter', enter);
      card.removeEventListener('mouseleave', leave);
      card.removeEventListener('focus', focusIn);
      card.removeEventListener('blur', leave);
      tl.kill();
    };
  }

  /* ------------------------------------------------------------------ */
  /* Zähler                                                               */
  /* ------------------------------------------------------------------ */
  function initCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var from = parseFloat(el.getAttribute('data-from') || '0');
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var state = { v: from };

    el.textContent = prefix + Math.round(from) + suffix;

    return gsap.to(state, {
      v: target,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: function () { el.textContent = prefix + Math.round(state.v) + suffix; },
      scrollTrigger: { trigger: el, start: 'top 85%', once: true }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Schriftgrösse (Barrierefreiheit)                                     */
  /* ------------------------------------------------------------------ */
  // Setzt html.ib-font-lg; der Zustand wird im <head> vor dem ersten
  // Rendern wiederhergestellt, damit nichts springt.
  function initFontSize(btn) {
    var root = document.documentElement;

    function sync() {
      var on = root.classList.contains('ib-font-lg');
      btn.setAttribute('aria-pressed', String(on));
      var label = on ? 'Normale Schriftgrösse' : 'Schrift vergrössern';
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }

    btn.addEventListener('click', function () {
      var on = root.classList.toggle('ib-font-lg');
      try { localStorage.setItem('ib-font', on ? 'lg' : ''); } catch (e) {}
      sync();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });

    sync();
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                 */
  /* ------------------------------------------------------------------ */
  function boot() {
    document.querySelectorAll('[data-ib-slider]').forEach(initSlider);
    document.querySelectorAll('[data-ib-fontsize]').forEach(initFontSize);

    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: '(min-width: 1024px)',
        canHover: '(hover: hover) and (pointer: fine)',
        reduceMotion: REDUCE
      },
      function (context) {
        var c = context.conditions;
        if (c.reduceMotion) return;

        var distance = c.isDesktop ? 48 : 28;

        /* Einzelne Elemente */
        // fromTo mit expliziten Endwerten: Elemente mit CSS-Transition auf transform
        // (z. B. .ib-btn) blieben mit gsap.from() sonst beim Startversatz hängen.
        gsap.utils.toArray('[data-ib-reveal]').forEach(function (el) {
          var type = el.getAttribute('data-ib-reveal');
          var from = { autoAlpha: 0 };
          var to = { autoAlpha: 1, duration: 1, ease: 'power3.out' };
          if (type === 'scale') { from.scale = 0.94; from.y = distance / 2; to.scale = 1; to.y = 0; }
          else if (type !== 'fade') { from.y = distance; to.y = 0; }
          to.scrollTrigger = { trigger: el, start: 'top 88%', once: true };
          gsap.fromTo(el, from, to);
        });

        /* Gruppen mit Stagger */
        gsap.utils.toArray('[data-ib-stagger]').forEach(function (group) {
          var items = group.querySelectorAll('[data-ib-item]');
          if (!items.length) return;
          gsap.fromTo(items, { autoAlpha: 0, y: distance }, {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: { trigger: group, start: 'top 85%', once: true }
          });
        });

        /* Parallax in Bildrahmen */
        gsap.utils.toArray('[data-ib-parallax]').forEach(function (img) {
          gsap.set(img, { scale: 1.15 });
          gsap.fromTo(img,
            { yPercent: -6 },
            {
              yPercent: 6,
              ease: 'none',
              scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        });

        /* Zähler */
        gsap.utils.toArray('[data-count]').forEach(initCounter);

        /* Hover nur auf Zeigegeräten */
        var cleanups = c.canHover ? gsap.utils.toArray('[data-ib-hover]').map(createHover) : [];

        return function () {
          cleanups.forEach(function (fn) { fn(); });
        };
      }
    );

    // Nach dem Laden aller Bilder Positionen neu berechnen (Lazy-Loading verschiebt Layout)
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
