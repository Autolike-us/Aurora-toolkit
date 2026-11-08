/* ---------------------------------------------------------------
   Playbook site settings. This is the ONLY file you need to edit.
   --------------------------------------------------------------- */
window.PLAYBOOK = {
  // Prices in US dollars (for display only: the SERVER sets the real price, see README).
  regularPrice: 29,
  specialPrice: 9,

  // The $9 launch special ends at this moment (UTC). 14 days from 8 Nov 2026.
  // It must match "playbook_special_ends" in aurora-config.php on the server.
  specialEndsAt: "2026-11-22T23:59:59Z",

  // Where the Buy buttons go. The Aurora server creates a secure Stripe checkout at the right price.
  buyUrl: "https://getaurorastudios.com/api/playbook/buy",
  // Used by the thank-you page to confirm payment and show the download link.
  apiBase: "https://getaurorastudios.com/api",

  supportEmail: "support@getaurorastudios.com",
  instagramUrl: "https://www.instagram.com/uncletoussaint/"
};
