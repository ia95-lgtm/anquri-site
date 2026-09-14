/* ═══════════════════════════════════════════════════════════════════════════
   ANQURI — le peu de script que le site demande.

   Trois choses, pas une de plus :
     1. l'en-tête prend un fond dès qu'on quitte le haut de page ;
     2. la jauge de chaleur suit le défilement et affiche une température ;
     3. les blocs montent en apparaissant.

   Tout est branché sur IntersectionObserver ou sur un scroll passif lissé par
   requestAnimationFrame : aucun calcul de mise en page n'est fait pendant le
   défilement, donc pas de saccade. Si l'utilisateur a demandé moins
   d'animations, on ne pose rien du tout.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var top = document.querySelector('.top');
  var jauge = document.querySelector('.gauge');
  var fill = jauge && jauge.querySelector('.fill');
  var read = jauge && jauge.querySelector('.read');

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
        /* 300 K au repos (température ambiante) jusqu'à 3200 K en bas de page :
           les mêmes bornes que les repères de la page du jeu. */
        read.textContent = Math.round(300 + p * 2900) + ' K';
      }
    }
  }

  function auScroll() {
    if (!tickEnCours) { tickEnCours = true; requestAnimationFrame(peindre); }
  }

  window.addEventListener('scroll', auScroll, { passive: true });
  window.addEventListener('resize', auScroll, { passive: true });
  peindre();

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
