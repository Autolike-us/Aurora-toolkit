/* Google Analytics for the playbook site. Off unless config.js has a valid gaId ("G-..."). Respects Do Not Track.
   Never send personal data (no emails, no payment-session ids): events carry only prices and button names. */
(function () {
  var id = (window.PLAYBOOK || {}).gaId;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.track = function (name, params) {
    try { if (window.__gaOn) window.gtag("event", name, Object.assign({ transport_type: "beacon" }, params || {})); } catch (e) { /* analytics must never break the page */ }
  };
  window.trackOnce = function (key, name, params) {
    var k = "pb_ev_" + key;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, "1"); } catch (e) { /* private mode: still send */ }
    window.track(name, params);
  };
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
  window.__gaOn = true;
  var s = document.createElement("script");
  s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
  document.head.appendChild(s);
  window.gtag("js", new Date());
  // The address is reported WITHOUT its query string (the thank-you page's address carries a private payment-session id).
  window.gtag("config", id, { anonymize_ip: true, page_location: location.origin + location.pathname });
})();
