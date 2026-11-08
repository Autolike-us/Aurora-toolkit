/* ---------------------------------------------------------------
   Playbook site settings. This is the ONLY file you need to edit.
   --------------------------------------------------------------- */
window.PLAYBOOK = {
  // Prices in US dollars.
  regularPrice: 29,
  specialPrice: 9,

  // The $9 launch special ends at this moment (UTC). 14 days from 8 Nov 2026.
  // After it passes, the site shows $29 automatically, the countdown disappears,
  // and the buttons switch to regularCheckoutUrl.
  specialEndsAt: "2026-11-22T23:59:59Z",

  // Payment links (Stripe Payment Link, PayPal, Whop, Gumroad, Stan Store...).
  // Make TWO links: one priced $9, one priced $29. Leave "" until you have them;
  // buttons then show a "launching shortly" message instead of a broken link.
  specialCheckoutUrl: "",
  regularCheckoutUrl: "",

  // Shown in the footer and used by the "Questions?" link.
  supportEmail: "support@getaurorastudios.com",

  // Social link for the character.
  instagramUrl: "https://www.instagram.com/uncletoussaint/"
};
