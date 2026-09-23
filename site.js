/* ═══════════════════════════════════════════════════════════════════════════
   ANQURI — le peu de script que le site demande.

   Quatre choses, pas une de plus :
     1. l'en-tête prend un fond dès qu'on quitte le haut de page ;
     2. la jauge suit le défilement : une température sur le site du studio et
        sur HEATSINK, la charge du ballon sur la page de SURVOLT ;
     3. les blocs montent en apparaissant ;
     4. l'état du serveur de SURVOLT (lobby.anquri.net) : en ligne ou non,
        parties en cours, joueurs connectés.

   1 à 3 sont branchés sur IntersectionObserver ou sur un scroll passif lissé
   par requestAnimationFrame : aucun calcul de mise en page pendant le
   défilement, donc pas de saccade. Si l'utilisateur a demandé moins
   d'animations, on ne pose aucune animation (l'état du serveur, lui, reste).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var top = document.querySelector('.top');
  var jauge = document.querySelector('.gauge');
  var fill = jauge && jauge.querySelector('.fill');
  var read = jauge && jauge.querySelector('.read');
  /* data-mode="charge" sur la jauge : on lit un multiplicateur, pas des kelvins */
  var charge = jauge && jauge.getAttribute('data-mode') === 'charge';
  var PALIERS = ['×1', '×2', '×3', '×6', '×12'];

  /* ── 1 + 2 : une seule lecture du scroll, une seule écriture par image ── */
  var tickEnCours = false;

  function peindre() {
    tickEnCours = false;
    var y = window.scrollY || document.documentElement.scrollTop;

    if (top) top.classList.toggle('scrolled', y > 24);

    if (jauge) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;
      jauge.style.setProperty('--heat', p.toFixed(4));
      jauge.classList.toggle('on', y > 120);
      if (read) {
        if (charge) {
          /* blanche ×1, cyan ×2, or ×3, or dans la zone ×6, zone + Overdrive ×12 :
             les mêmes paliers que les titres de section de la page du jeu */
          read.textContent = PALIERS[Math.min(4, Math.floor(p * 5))];
        } else {
          /* 300 K au repos (température ambiante) jusqu'à 3200 K en bas de page :
             les mêmes bornes que les repères de la page du jeu. */
          read.textContent = Math.round(300 + p * 2900) + ' K';
        }
      }
    }
  }

  function auScroll() {
    if (!tickEnCours) { tickEnCours = true; requestAnimationFrame(peindre); }
  }

  window.addEventListener('scroll', auScroll, { passive: true });
  window.addEventListener('resize', auScroll, { passive: true });
  peindre();

  /* ── 4 : l'état du serveur de parties ─────────────────────────────────────
     Tout élément portant data-lobby="https://…" est rempli à partir de
     /api/stats : data-k="games" | "players" | "inMatch" | "inLobby" |
     "publicGames" | "privateGames" | "relays" | "latency", et .live-state /
     .live-when pour l'état et l'heure. On interroge toutes les 20 s, et
     seulement quand l'onglet est visible (un onglet oublié ne coûte rien). */
  var panneaux = document.querySelectorAll('[data-lobby]');
  var DELAI = 20000;

  function poser(el, k, v) {
    var cibles = el.querySelectorAll('[data-k="' + k + '"]');
    for (var i = 0; i < cibles.length; i++) cibles[i].textContent = v;
  }

  function interroger(el) {
    var base = el.getAttribute('data-lobby').replace(/\/+$/, '');
    var etat = el.querySelector('.live-state');
    var quand = el.querySelector('.live-when');
    var t0 = performance.now();
    var ctl = 'AbortController' in window ? new AbortController() : null;
    var minuteur = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);

    fetch(base + '/api/stats', { cache: 'no-store', mode: 'cors', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        clearTimeout(minuteur);
        el.setAttribute('data-state', 'up');
        if (etat) etat.lastChild.textContent = 'Online';
        var cles = ['games', 'players', 'inMatch', 'inLobby', 'publicGames', 'privateGames', 'relays'];
        for (var i = 0; i < cles.length; i++) poser(el, cles[i], d[cles[i]] != null ? d[cles[i]] : '–');
        poser(el, 'latency', Math.round(performance.now() - t0) + ' ms');
        if (quand) quand.textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      })
      .catch(function () {
        clearTimeout(minuteur);
        el.setAttribute('data-state', 'down');
        if (etat) etat.lastChild.textContent = 'Offline';
        var cles = ['games', 'players', 'inMatch', 'inLobby', 'publicGames', 'privateGames', 'relays', 'latency'];
        for (var i = 0; i < cles.length; i++) poser(el, cles[i], '–');
        if (quand) quand.textContent = 'No answer · retrying';
      });
  }

  function tour() {
    if (document.visibilityState === 'hidden') return;
    for (var i = 0; i < panneaux.length; i++) interroger(panneaux[i]);
  }

  if (panneaux.length && 'fetch' in window) {
    tour();
    setInterval(tour, DELAI);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') tour();
    });
  }

  /* ── 3 : les révélations ──────────────────────────────────────────────── */
  var cibles = document.querySelectorAll('.rise');

  if (calme || !('IntersectionObserver' in window)) {
    for (var i = 0; i < cibles.length; i++) cibles[i].classList.add('in');
    return;
  }

  var obs = new IntersectionObserver(function (entrees) {
    for (var k = 0; k < entrees.length; k++) {
      if (entrees[k].isIntersecting) {
        entrees[k].target.classList.add('in');
        obs.unobserve(entrees[k].target);   /* une fois révélé, on oublie */
      }
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

  for (var j = 0; j < cibles.length; j++) obs.observe(cibles[j]);
})();
