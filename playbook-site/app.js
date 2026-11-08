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
    $$("[data-buy]").forEach(function (a) { a.href = C.buyUrl || "#buy"; });
    if (on) {
      var ms = endsAt - Date.now();
      var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5),
          m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
      $$("[data-countdown]").forEach(function (el) {
        el.textContent = d + "d " + pad(h) + "h " + pad(m) + "m " + pad(s) + "s";
      });
    }
  }

  // Coming back from a checkout that could not start: show the notice.
  if (/[?&]checkout=error/.test(location.search)) { var n = $("#pending-note"); if (n) n.hidden = false; }

  $$("[data-ig]").forEach(function (a) { if (C.instagramUrl) a.href = C.instagramUrl; });
  $$("[data-mail]").forEach(function (a) { a.href = "mailto:" + C.supportEmail; a.textContent = a.textContent || C.supportEmail; });

  render();
  setInterval(render, 1000);

  // ---- Analytics: what people look at and click (see track.js). ----
  function item() { var on = specialActive(); return [{ item_id: "playbook", item_name: "The AI Character Playbook", price: on ? C.specialPrice : C.regularPrice, quantity: 1 }]; }
  function money() { return specialActive() ? C.specialPrice : C.regularPrice; }
  if (window.track) {
    window.track("view_item", { currency: "USD", value: money(), items: item(), special_active: specialActive() });
    // Which buy button: nav, hero, offer box or final banner.
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("[data-buy]");
      if (!a) return;
      var loc = a.closest(".nav") ? "nav" : a.closest(".hero") ? "hero" : a.closest(".ticket") ? "offer" : a.closest(".final") ? "final" : "other";
      window.track("begin_checkout", { currency: "USD", value: money(), items: item(), button_location: loc, special_active: specialActive() });
    });
    // How far down the page people get: each main section, once.
    if ("IntersectionObserver" in window) {
      var seen = {};
      var so = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var name = e.target.id || e.target.getAttribute("data-section");
          if (e.isIntersecting && name && !seen[name]) { seen[name] = 1; window.track("view_section", { section: name }); so.unobserve(e.target); }
        });
      }, { threshold: 0.35 });
      $$("#proof, #inside, #tools, #buy, #faq").forEach(function (el) { so.observe(el); });
      $$(".final").forEach(function (el) { el.setAttribute("data-section", "final_cta"); so.observe(el); });
    }
    $$(".faq details").forEach(function (d) {
      d.addEventListener("toggle", function () { if (d.open) window.track("faq_open", { question: (d.querySelector("summary") || {}).textContent }); });
    });
  }

  // Reveal on scroll
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else { $$(".reveal").forEach(function (el) { el.classList.add("in"); }); }
})();
