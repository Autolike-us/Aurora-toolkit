(function () {
  var C = window.PLAYBOOK || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var endsAt = Date.parse(C.specialEndsAt);
  function specialActive() { return isFinite(endsAt) && Date.now() < endsAt; }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function render() {
    var on = specialActive();
    var price = on ? C.specialPrice : C.regularPrice;
    $$("[data-price]").forEach(function (el) { el.textContent = "$" + price; });
    $$("[data-regular]").forEach(function (el) { el.textContent = "$" + C.regularPrice; });
    $$("[data-special-only]").forEach(function (el) { el.hidden = !on; });
    $$("[data-regular-only]").forEach(function (el) { el.hidden = on; });
    var url = on ? C.specialCheckoutUrl : C.regularCheckoutUrl;
    $$("[data-buy]").forEach(function (a) {
      if (url) { a.href = url; a.removeAttribute("data-pending"); a.target = "_self"; }
      else { a.href = "#pending"; a.setAttribute("data-pending", "1"); }
    });
    if (on) {
      var ms = endsAt - Date.now();
      var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5),
          m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
      $$("[data-countdown]").forEach(function (el) {
        el.textContent = d + "d " + pad(h) + "h " + pad(m) + "m " + pad(s) + "s";
      });
    }
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-buy]");
    if (a && a.getAttribute("data-pending")) {
      e.preventDefault();
      var n = $("#pending-note");
      if (n) { n.hidden = false; n.scrollIntoView({ behavior: "smooth", block: "center" }); }
    }
  });

  var ig = $$("[data-ig]"); ig.forEach(function (a) { if (C.instagramUrl) a.href = C.instagramUrl; });
  $$("[data-mail]").forEach(function (a) { a.href = "mailto:" + C.supportEmail; a.textContent = a.textContent || C.supportEmail; });

  render();
  setInterval(render, 1000);

  // Reveal on scroll
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else { $$(".reveal").forEach(function (el) { el.classList.add("in"); }); }
})();
