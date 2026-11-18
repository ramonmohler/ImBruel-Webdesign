/**
 * Prototyp 2 – Feature-Grid "Unsere Angebote"
 * Abhängigkeiten (via wp_register_script): gsap, gsap-scrolltrigger
 *
 * - Scroll-Reveal: Kopf + Karten erscheinen gestaffelt (Desktop: als Gruppe,
 *   Mobile: per ScrollTrigger.batch Karte für Karte)
 * - Hover/Fokus: eine pausierte Timeline pro Karte (Anheben, Schatten, Icon, Pfeil),
 *   die per play()/reverse() jederzeit sauber unterbrochen werden kann
 * - Tabs: Indikator gleitet (x + scaleX), Karten wechseln gestaffelt
 * Animiert werden ausschliesslich transform und opacity.
 */
(function () {
  'use strict';

  var REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

  function prefersReducedMotion() {
    return window.matchMedia(REDUCE_QUERY).matches;
  }

  /* ------------------------------------------------------------------ */
  /* Tabs (funktionieren auch ohne GSAP)                                 */
  /* ------------------------------------------------------------------ */
  function initTabs(section, hasGsap) {
    var tablist = section.querySelector('[role="tablist"]');
    if (!tablist) return;

    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var indicator = tablist.querySelector('[data-tab-indicator]');
    var baseWidth = 0;
    var busy = false;

    function activeTab() {
      return tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    }

    // Indikator nur über transform bewegen: Breite einmal setzen, danach scaleX.
    function placeIndicator(tab, animate) {
      if (!indicator || !hasGsap) return;
      if (!baseWidth) {
        baseWidth = tab.offsetWidth;
        indicator.style.width = baseWidth + 'px';
      }
      var props = {
        x: tab.offsetLeft,
        scaleX: tab.offsetWidth / baseWidth,
        duration: animate && !prefersReducedMotion() ? 0.5 : 0,
        ease: 'power3.inOut',
        overwrite: true
      };
      gsap.to(indicator, props);
    }

    function select(tab, focus) {
      var current = activeTab();
      if (tab === current || busy) return;

      var oldPanel = document.getElementById(current.getAttribute('aria-controls'));
      var newPanel = document.getElementById(tab.getAttribute('aria-controls'));

      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      placeIndicator(tab, true);

      if (!hasGsap || prefersReducedMotion()) {
        oldPanel.hidden = true;
        newPanel.hidden = false;
        return;
      }

      busy = true;
      var oldItems = oldPanel.querySelectorAll('.ib-angebote__item');
      var newItems = newPanel.querySelectorAll('.ib-angebote__item');

      gsap.timeline({ onComplete: function () { busy = false; ScrollTrigger.refresh(); } })
        .to(oldItems, {
          autoAlpha: 0,
          y: -12,
          duration: 0.25,
          ease: 'power2.in',
          stagger: 0.04
        })
        .add(function () {
          oldPanel.hidden = true;
          gsap.set(oldItems, { clearProps: 'opacity,visibility,transform' });
          newPanel.hidden = false;
        })
        .fromTo(newItems,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08 });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });

    if (hasGsap && indicator) {
      placeIndicator(activeTab(), false);
      // Bei Resize neu messen (Layout ändert sich zwischen Breakpoints)
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          baseWidth = 0;
          placeIndicator(activeTab(), false);
        }, 120);
      });
      document.fonts && document.fonts.ready.then(function () {
        baseWidth = 0;
        placeIndicator(activeTab(), false);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Hover-Timelines                                                      */
  /* ------------------------------------------------------------------ */
  function createHover(card) {
    var tl = gsap.timeline({ paused: true, defaults: { duration: 0.45, ease: 'power3.out' } });

    var icon = card.querySelector('.ib-card__icon');
    var img = card.querySelector('.ib-card__img');

    tl.to(card, { y: -6 }, 0)
      .to(card.querySelector('.ib-card__shadow'), { opacity: 1 }, 0)
      .fromTo(card.querySelector('.ib-card__arrow'),
        { x: -8, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.35 }, 0.05);

    // Icon-Karte: Icon wippt; Fotokarte: Bild zoomt leicht im Rahmen
    if (icon) tl.to(icon, { scale: 1.12, rotation: -6, ease: 'back.out(2.2)' }, 0);
    if (img) tl.to(img, { scale: 1.06, duration: 0.8, ease: 'power2.out' }, 0);

    function enter() { tl.timeScale(1).play(); }
    function leave() { tl.timeScale(1.4).reverse(); }
    function focusIn() { if (card.matches(':focus-visible')) enter(); }

    card.addEventListener('mouseenter', enter);
    card.addEventListener('mouseleave', leave);
    card.addEventListener('focus', focusIn);
    card.addEventListener('blur', leave);

    // Cleanup-Funktion für matchMedia
    return function () {
      card.removeEventListener('mouseenter', enter);
      card.removeEventListener('mouseleave', leave);
      card.removeEventListener('focus', focusIn);
      card.removeEventListener('blur', leave);
      tl.kill();
    };
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                 */
  /* ------------------------------------------------------------------ */
  function initSection(section) {
    var hasGsap = !!(window.gsap && window.ScrollTrigger);
    initTabs(section, hasGsap);
    if (!hasGsap) return;

    gsap.registerPlugin(ScrollTrigger);
    section.classList.add('is-enhanced');

    var q = gsap.utils.selector(section);
    var headItems = q('[data-reveal="head"]');
    var grid = q('[data-angebote-grid]')[0];
    var figure = q('.ib-angebote__figure');
    var cards = q('.ib-card');

    var mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: '(min-width: 1024px)',
        isMobile: '(max-width: 1023px)',
        canHover: '(hover: hover) and (pointer: fine)',
        reduceMotion: REDUCE_QUERY
      },
      function (context) {
        var c = context.conditions;
        if (c.reduceMotion) return; // Alles bleibt sichtbar, keine Bewegung

        // Nur das sichtbare Panel animieren; versteckte Panels erledigt der Tab-Wechsel
        var items = q('.ib-angebote__panel:not([hidden]) .ib-angebote__item');

        /* ---------- Kopf ---------- */
        gsap.from(headItems, {
          autoAlpha: 0,
          y: 28,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: { trigger: section, start: 'top 80%', once: true }
        });

        /* ---------- Karten ---------- */
        if (c.isDesktop) {
          gsap.set(items, { autoAlpha: 0, y: 48 });
          gsap.set(figure, { autoAlpha: 0, scale: 0.96 });

          gsap.timeline({
            scrollTrigger: { trigger: grid, start: 'top 78%', once: true }
          })
            .to(items, {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              ease: 'power3.out',
              stagger: { each: 0.12, from: 'start' }
            })
            .to(figure, {
              autoAlpha: 1,
              scale: 1,
              duration: 1.1,
              ease: 'power2.out'
            }, 0.2);
        } else {
          // Mobile: lange Liste -> Karten erscheinen, sobald sie selbst ins Bild kommen
          gsap.set(items, { autoAlpha: 0, y: 32 });
          ScrollTrigger.batch(items, {
            start: 'top 90%',
            once: true,
            onEnter: function (batch) {
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.7,
                ease: 'power3.out',
                stagger: 0.1,
                overwrite: true
              });
            }
          });
        }

        /* ---------- Hover (nur echte Zeiger-Geräte) ---------- */
        var cleanups = c.canHover ? cards.map(createHover) : [];

        return function () {
          cleanups.forEach(function (fn) { fn(); });
        };
      }
    );
  }

  function boot() {
    document.querySelectorAll('[data-ib-angebote]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
