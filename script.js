/* =====================================================
   ATELIER ÉPURE — interactions
   Vanilla JS, zéro dépendance. Code possédé.
   ===================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. NAV : fond au scroll + mode clair sur l'intro sombre ---------- */
  var nav = document.getElementById("nav");
  var hasIntro = !!document.querySelector(".intro");
  function onScrollNav() {
    if (window.scrollY > 40) {
      nav.classList.add("is-scrolled");
      nav.classList.remove("is-ontop-dark");
    } else {
      nav.classList.remove("is-scrolled");
      if (hasIntro) nav.classList.add("is-ontop-dark");
    }
  }
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  /* ---------- 2. BURGER (mobile) : scroll vers sections ---------- */
  var burger = document.getElementById("burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var t = document.getElementById("tarifs");
      if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* ---------- 3. REVEALS au scroll (IntersectionObserver) ---------- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-line");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- 4. TEXTE CINÉTIQUE : remplissage mot à mot au scroll ---------- */
  // Découpe chaque [data-kinetic] en mots <span class="w">, puis illumine
  // selon la progression du scroll dans la fenêtre.
  var kinetics = [];
  document.querySelectorAll("[data-kinetic]").forEach(function (node) {
    var html = node.innerHTML;
    // On préserve les <em>…</em> en les traitant comme des mots illuminables.
    var tmp = document.createElement("div");
    tmp.innerHTML = html;

    function wrapTextNode(textNode, parent) {
      var parts = textNode.nodeValue.split(/(\s+)/);
      parts.forEach(function (p) {
        if (p.trim() === "") {
          parent.appendChild(document.createTextNode(p));
        } else {
          var s = document.createElement("span");
          s.className = "w";
          s.textContent = p;
          parent.appendChild(s);
        }
      });
    }

    var out = document.createDocumentFragment();
    Array.prototype.forEach.call(tmp.childNodes, function (child) {
      if (child.nodeType === 3) {
        wrapTextNode(child, out);
      } else if (child.nodeType === 1) {
        // ex. <em> : on enveloppe son texte mais on garde la balise (et la classe .w sur l'em)
        var el = child.cloneNode(false);
        el.classList.add("w");
        el.textContent = child.textContent;
        out.appendChild(el);
      }
    });

    node.innerHTML = "";
    node.appendChild(out);
    kinetics.push({ el: node, words: node.querySelectorAll(".w") });
  });

  function updateKinetic() {
    var vh = window.innerHeight;
    kinetics.forEach(function (k) {
      var r = k.el.getBoundingClientRect();
      // progression : 0 quand le bloc entre par le bas, 1 quand il atteint ~1/3 haut
      var start = vh * 0.85;
      var end = vh * 0.32;
      var prog = (start - r.top) / (start - end);
      prog = Math.max(0, Math.min(1, prog));
      var lit = Math.round(prog * k.words.length);
      for (var i = 0; i < k.words.length; i++) {
        if (i < lit) k.words[i].classList.add("lit");
        else k.words[i].classList.remove("lit");
      }
    });
  }
  if (!reduce && kinetics.length) {
    updateKinetic();
    window.addEventListener("scroll", updateKinetic, { passive: true });
    window.addEventListener("resize", updateKinetic);
  } else {
    kinetics.forEach(function (k) {
      k.words.forEach(function (w) { w.classList.add("lit"); });
    });
  }

  /* ---------- 5. MARQUEES : défilement JS (boucle douce, indépendante du scroll) ---------- */
  document.querySelectorAll(".marquee__track").forEach(function (track, idx) {
    if (reduce) return;
    var speed = track.closest(".footer__marquee") ? 0.35
              : track.closest(".marquee--cta") ? 0.4
              : 0.55;
    // sens alterné pour un peu de vie
    var dir = idx % 2 === 0 ? -1 : -1;
    var x = 0;
    var half = track.scrollWidth / 2; // contenu dupliqué → boucle sur la moitié
    function step() {
      x += speed * dir;
      if (-x >= half) x = 0;
      track.style.transform = "translate3d(" + x + "px,0,0)";
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });

  /* ---------- 6. FAQ : ouverture/fermeture animée (hauteur) ---------- */
  document.querySelectorAll(".qa").forEach(function (qa) {
    var summary = qa.querySelector("summary");
    var content = qa.querySelector("p");
    if (!summary || !content) return;

    summary.addEventListener("click", function (ev) {
      if (reduce) return;
      ev.preventDefault();
      if (qa.open) {
        // fermeture
        content.style.height = content.scrollHeight + "px";
        requestAnimationFrame(function () {
          content.style.transition = "height .35s ease, opacity .25s ease";
          content.style.opacity = "0";
          content.style.height = "0px";
        });
        content.addEventListener("transitionend", function close() {
          qa.open = false;
          content.style.transition = content.style.height = content.style.opacity = "";
          content.removeEventListener("transitionend", close);
        });
      } else {
        // fermer les autres (accordéon)
        document.querySelectorAll(".qa[open]").forEach(function (o) {
          if (o !== qa) o.open = false;
        });
        qa.open = true;
        content.style.height = "0px";
        content.style.opacity = "0";
        requestAnimationFrame(function () {
          content.style.transition = "height .35s ease, opacity .3s ease .05s";
          content.style.height = content.scrollHeight + "px";
          content.style.opacity = "1";
        });
        content.addEventListener("transitionend", function open() {
          content.style.height = content.style.transition = "";
          content.removeEventListener("transitionend", open);
        });
      }
    });
  });

  /* ---------- 7. Parallaxe douce sur la puce média du hero ---------- */
  var chip = document.querySelector(".hero .chip");
  if (chip && !reduce) {
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (y < window.innerHeight) {
        chip.style.transform = "translateY(" + (0.05 * 16 + y * 0.06) + "px)";
      }
    }, { passive: true });
  }
})();
