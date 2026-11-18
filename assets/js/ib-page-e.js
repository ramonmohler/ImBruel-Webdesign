/**
 * Prototyp E – Seitenspezifische Animationen
 * Abhängigkeiten: gsap, gsap-scrolltrigger, gsap-splittext
 *
 * - Hero: Bild zoomt beim Laden heraus, Headline-Zeilen gleiten aus der Maske,
 *   Navigation/Button/Karte folgen. Beim Scrollen: Bild-Parallax, Text blendet aus.
 * - Haltung: Wörter der grossen Aussage hellen beim Scrollen nacheinander auf (scrub),
 *   die Bildreihe fächert sich von der Mitte aus auf.
 * - Warum: Karte gleitet ins Bild.
 * - FAQ: Akkordeon (eine Frage offen), funktioniert auch ohne GSAP.
 */
(function () {
  'use strict';

  var REDUCE = '(prefers-reduced-motion: reduce)';

  /* ------------------------------------------------------------------ */
  /* Akkordeon                                                            */
  /* ------------------------------------------------------------------ */
  function initAccordion(list) {
    var items = Array.prototype.slice.call(list.querySelectorAll('.e-faq__item'));
    var hasGsap = !!window.gsap;

    items.forEach(function (item) {
      var panel = item.querySelector('.e-faq__a');
      panel.style.height = item.classList.contains('is-open') ? 'auto' : '0px';
    });

    function toggle(item, open) {
      var btn = item.querySelector('.e-faq__q');
      var panel = item.querySelector('.e-faq__a');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));

      if (hasGsap && !window.matchMedia(REDUCE).matches) {
        // Höhe auf ein kleines Panel begrenzt – Inhalt selbst nur opacity/transform
        gsap.to(panel, { height: open ? 'auto' : 0, duration: open ? 0.45 : 0.3, ease: open ? 'power3.out' : 'power2.inOut' });
        if (open) gsap.fromTo(panel.firstElementChild, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4, delay: 0.1 });
      } else {
        panel.style.height = open ? 'auto' : '0px';
      }
    }

    items.forEach(function (item) {
      item.querySelector('.e-faq__q').addEventListener('click', function () {
        var willOpen = !item.classList.contains('is-open');
        items.forEach(function (other) {
          if (other !== item && other.classList.contains('is-open')) toggle(other, false);
        });
        toggle(item, willOpen);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero                                                                 */
  /* ------------------------------------------------------------------ */
  function initHero(hero, c) {
    var q = gsap.utils.selector(hero);
    var bg = q('[data-e-hero-bg]');
    var img = q('[data-e-hero-img]');
    var title = q('[data-e-hero-title]')[0];
    var content = q('[data-e-hero-content]');
    var nav = q('[data-e-hero-anim="nav"]');
    var btn = q('[data-e-hero-anim="btn"]');
    var card = q('[data-e-hero-anim="card"]');
    var num = q('[data-e-rooms-num]')[0];
    var split = null;

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 2.2, ease: 'power2.out' }, 0)
      .from(nav, { autoAlpha: 0, y: -24, duration: 0.8 }, 0.2);

    if (window.SplitText && title) {
      gsap.registerPlugin(SplitText);
      gsap.set(title, { autoAlpha: 1 });
      split = SplitText.create(title, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.4 });
        }
      });
    } else {
      tl.from(title, { autoAlpha: 0, y: 40, duration: 1 }, 0.4);
    }

    // fromTo statt from: der Button hat eine CSS-Transition auf transform,
    // dadurch las GSAP sonst den Startwert (20px) als Endwert ein.
    tl.fromTo(btn, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.85)
      .from(card, { autoAlpha: 0, x: 40, duration: 0.9 }, 1);

    // Zähler freie Zimmer: rollt von 0 auf den Wert aus dem Markup
    if (num) {
      var target = parseInt(num.textContent, 10) || 0;
      var counter = { v: 0 };
      num.textContent = '0';
      tl.to(counter, {
        v: target,
        duration: 1,
        ease: 'power2.out',
        onUpdate: function () { num.textContent = Math.round(counter.v); }
      }, 1.3);
    }

    // Scroll: Bild wandert langsamer (Parallax), Text hebt sich ab und blendet aus
    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: c.isDesktop ? 0.6 : true }
    })
      .to(bg, { yPercent: 10, ease: 'none' }, 0)
      .to(content, { y: -60, autoAlpha: 0, ease: 'power1.in' }, 0)
      .to(card, { y: -90, ease: 'none' }, 0);

    return function () { if (split) split.revert(); };
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ */
  /* Mobiles Menü                                                         */
  /* ------------------------------------------------------------------ */
  function initMenu() {
    var toggle = document.querySelector('[data-e-menu-toggle]');
    var menu = document.querySelector('[data-e-menu]');
    if (!toggle || !menu) return;

    function set(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
      menu.classList.toggle('is-open', open);
    }

    toggle.addEventListener('click', function () {
      set(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { set(false); toggle.focus(); }
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  }

  function boot() {
    document.querySelectorAll('[data-e-accordion]').forEach(initAccordion);
    initMenu();

    var hero = document.querySelector('[data-e-hero]');

    if (!window.gsap || !window.ScrollTrigger) {
      if (hero) hero.querySelectorAll('[data-e-hero-anim],[data-e-hero-title]').forEach(function (el) { el.style.visibility = 'visible'; });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add(
      { isDesktop: '(min-width: 1024px)', reduceMotion: REDUCE },
      function (context) {
        var c = context.conditions;
        var cleanups = [];

        if (c.reduceMotion) {
          if (hero) gsap.set(hero.querySelectorAll('[data-e-hero-anim],[data-e-hero-title]'), { autoAlpha: 1 });
          return;
        }

        if (hero) cleanups.push(initHero(hero, c));

        /* Haltung: Wort für Wort aufhellen */
        var words = document.querySelector('[data-e-words]');
        if (words && window.SplitText) {
          var wsplit = SplitText.create(words, { type: 'words', autoSplit: true,
            onSplit: function (self) {
              return gsap.fromTo(self.words,
                { opacity: 0.15 },
                {
                  opacity: 1,
                  ease: 'none',
                  stagger: 0.1,
                  scrollTrigger: { trigger: words, start: 'top 80%', end: 'bottom 45%', scrub: true }
                });
            }
          });
          cleanups.push(function () { wsplit.revert(); });
        }

        /* Bildreihe fächert sich von der Mitte auf */
        var fan = document.querySelector('[data-e-fan]');
        if (fan) {
          var figs = gsap.utils.toArray(fan.children).filter(function (f) { return f.offsetParent !== null; });
          gsap.from(figs, {
            autoAlpha: 0,
            y: 60,
            scale: 0.85,
            rotation: function (i) { return (i - (figs.length - 1) / 2) * 4; },
            duration: 1,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'center' },
            scrollTrigger: { trigger: fan, start: 'top 85%', once: true }
          });
        }

        /* Warum: Karte gleitet herein */
        var whyCard = document.querySelector('[data-e-why-card]');
        if (whyCard) {
          gsap.from(whyCard, {
            autoAlpha: 0,
            x: c.isDesktop ? -40 : 0,
            y: c.isDesktop ? 0 : 30,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: whyCard, start: 'top 85%', once: true }
          });
          gsap.from(whyCard.querySelectorAll('.e-why__item'), {
            autoAlpha: 0,
            y: 16,
            duration: 0.6,
            stagger: 0.1,
            delay: 0.3,
            scrollTrigger: { trigger: whyCard, start: 'top 85%', once: true }
          });
        }

        return function () { cleanups.forEach(function (fn) { fn && fn(); }); };
      }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
