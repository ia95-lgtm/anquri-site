/* ANQURI — comportements du site (sans dépendance).
   1 en-tête  2 méga-menu  3 menu mobile  4 héros vidéo  5 carrousel
   6 filtres  7 bande-annonce  8 galerie  9 sous-navigation  10 serveur SURVOLT
   11 révélations */
(function () {
  'use strict';
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* 1 ── en-tête : opaque dès qu'on quitte le haut de page */
  var head = $('.head');
  function teinte() { if (head) head.classList.toggle('solid', window.scrollY > 40 || document.body.classList.contains('nav-open')); }
  window.addEventListener('scroll', teinte, { passive: true }); teinte();

  /* 2 ── méga-menu « Games » : survol, clic, clavier, Échap */
  $$('.has-mega').forEach(function (m) {
    var b = $('button', m), t;
    function ouvre(v) { m.classList.toggle('open', v); b.setAttribute('aria-expanded', v ? 'true' : 'false'); }
    m.addEventListener('mouseenter', function () { clearTimeout(t); ouvre(true); });
    m.addEventListener('mouseleave', function () { t = setTimeout(function () { ouvre(false); }, 160); });
    b.addEventListener('click', function () { ouvre(!m.classList.contains('open')); });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { ouvre(false); b.focus(); } });
    m.addEventListener('focusout', function (e) { if (!m.contains(e.relatedTarget)) ouvre(false); });
  });

  /* 3 ── menu mobile */
  var burger = $('.burger');
  if (burger) burger.addEventListener('click', function () {
    var o = document.body.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', o ? 'true' : 'false'); teinte();
  });
  $$('.drawer a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('nav-open'); teinte(); }); });

  /* 4 ── héros vidéo : lecture muette en boucle, bouton son ; image fixe si « moins d'animations » */
  var hv = $('.hero video'), snd = $('.hero .sound');
  if (hv) {
    if (calme) { hv.removeAttribute('autoplay'); hv.pause(); hv.style.display = 'none'; }
    else { var p = hv.play(); if (p && p.catch) p.catch(function () {}); }
    if (snd) snd.addEventListener('click', function () {
      hv.muted = !hv.muted; if (!hv.muted) { hv.currentTime = 0; hv.play(); hv.style.display = ''; }
      snd.setAttribute('aria-pressed', hv.muted ? 'false' : 'true');
      snd.setAttribute('aria-label', hv.muted ? 'Turn sound on' : 'Turn sound off');
      $('.on', snd).style.display = hv.muted ? 'none' : ''; $('.off', snd).style.display = hv.muted ? '' : 'none';
    });
  }

  /* 5 ── carrousel « à la une » : onglets, défilement auto, pause au survol, balayage */
  $$('.feature').forEach(function (f) {
    var slides = $$('.slide', f), tabs = $$('.tab', f), i = 0, timer = null;
    var ms = parseInt(f.getAttribute('data-ms') || '7000', 10);
    f.style.setProperty('--slide-ms', ms + 'ms');
    function va(n, focus) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      tabs.forEach(function (t, k) {
        t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1;
        var bar = $('.bar', t); if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      });
      if (focus) tabs[i].focus();
      relance();
    }
    function relance() { clearTimeout(timer); if (!calme && !f.classList.contains('paused')) timer = setTimeout(function () { va(i + 1); }, ms); }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { va(k); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') va(i + 1, true); else if (e.key === 'ArrowLeft') va(i - 1, true);
      });
    });
    f.addEventListener('mouseenter', function () { f.classList.add('paused'); clearTimeout(timer); });
    f.addEventListener('mouseleave', function () { f.classList.remove('paused'); relance(); });
    f.addEventListener('focusin', function () { f.classList.add('paused'); clearTimeout(timer); });
    f.addEventListener('focusout', function (e) { if (!f.contains(e.relatedTarget)) { f.classList.remove('paused'); relance(); } });
    var x0 = null;
    f.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    f.addEventListener('touchend', function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) va(i + (dx < 0 ? 1 : -1));
    });
    va(0);
  });

  /* 6 ── filtres de la grille des jeux */
  $$('.filters').forEach(function (bar) {
    var grid = $(bar.getAttribute('data-for'));
    $$('button', bar).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('button', bar).forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        var f = b.getAttribute('data-f');
        $$('.card', grid).forEach(function (c) { c.hidden = f !== 'all' && c.getAttribute('data-state') !== f; });
      });
    });
  });

  /* 7 ── bande-annonce YouTube : rien n'est chargé avant le clic (vie privée, vitesse) */
  $$('.yt').forEach(function (y) {
    y.addEventListener('click', function () {
      var id = y.getAttribute('data-yt');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.title = y.getAttribute('aria-label') || 'Trailer';
      y.innerHTML = ''; y.appendChild(f); y.style.cursor = 'default';
    }, { once: true });
  });

  /* 8 ── galerie : visionneuse plein écran */
  var lb = $('.lightbox');
  if (lb) {
    var lbi = $('img', lb), close = $('button', lb), last = null;
    $$('.gallery button').forEach(function (b) {
      b.addEventListener('click', function () {
        last = b; lbi.src = b.getAttribute('data-full'); lbi.alt = $('img', b).alt;
        lb.classList.add('open'); close.focus();
      });
    });
    function ferme() { lb.classList.remove('open'); if (last) last.focus(); }
    close.addEventListener('click', ferme);
    lb.addEventListener('click', function (e) { if (e.target === lb) ferme(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('open')) ferme(); });
  }

  /* 9 ── sous-navigation des pages de jeu : section courante */
  var liens = $$('.subnav a[href^="#"]');
  if (liens.length && 'IntersectionObserver' in window) {
    var parId = {}; liens.forEach(function (a) { parId[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && parId[e.target.id]) {
          liens.forEach(function (a) { a.classList.remove('on'); }); parId[e.target.id].classList.add('on');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(parId).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* 10 ── état du serveur de SURVOLT (lobby.anquri.net/api/stats), toutes les 20 s si l'onglet est visible */
  var panneaux = $$('[data-lobby]');
  function pose(el, k, v) { $$('[data-k="' + k + '"]', el).forEach(function (c) { c.textContent = v; }); }
  function interroge(el) {
    var base = el.getAttribute('data-lobby').replace(/\/+$/, ''), etat = $('.live-state', el);
    var ctl = 'AbortController' in window ? new AbortController() : null, t0 = performance.now();
    var mt = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    var cles = ['games', 'players', 'inMatch', 'inLobby'];
    fetch(base + '/api/stats', { cache: 'no-store', mode: 'cors', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        clearTimeout(mt); el.setAttribute('data-state', 'up'); if (etat) etat.textContent = 'Server online';
        cles.forEach(function (k) { pose(el, k, d[k] != null ? d[k] : '–'); });
        pose(el, 'latency', Math.round(performance.now() - t0) + ' ms');
      })
      .catch(function () {
        clearTimeout(mt); el.setAttribute('data-state', 'down'); if (etat) etat.textContent = 'Server offline';
        cles.forEach(function (k) { pose(el, k, '–'); });
      });
  }
  function tour() { if (document.visibilityState !== 'hidden') panneaux.forEach(interroge); }
  if (panneaux.length && 'fetch' in window) {
    tour(); setInterval(tour, 20000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tour(); });
  }

  /* 11 ── révélations au défilement */
  var cibles = $$('.rise');
  if (calme || !('IntersectionObserver' in window)) { cibles.forEach(function (c) { c.classList.add('in'); }); return; }
  var obs = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  cibles.forEach(function (c) { obs.observe(c); });
})();
