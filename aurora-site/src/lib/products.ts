export type ProductId = 'facebook' | 'instagram' | 'tiktok';

export interface Product {
  id: ProductId;
  slug: ProductId;
  name: string;
  short: string;
  tagline: string;
  accent: string;
  accent2: string;
  actions: string[];
  highlights: string[];
  site: string;
  /** file name of the private release zip in the `releases` storage bucket */
  zip: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'facebook', slug: 'facebook', name: 'Aurora for Facebook', short: 'Facebook', accent: '#1877f2', accent2: '#2bb673',
    tagline: 'Walk your feed like a person: react, comment, share, follow and more — in place, at your pace.',
    actions: ['React (all 7 reactions)', 'Comment', 'Share', 'Follow', 'Unfollow', 'Send friend requests', 'Join groups'],
    highlights: ['Works through pages, profiles, groups and hashtags', 'Finds the first post you have not handled and acts on it', 'Skips already-reacted posts automatically'],
    site: 'facebook.com', zip: 'aurora-facebook-latest.zip',
  },
  {
    id: 'instagram', slug: 'instagram', name: 'Aurora for Instagram', short: 'Instagram', accent: '#d62976', accent2: '#ef8430',
    tagline: 'Open a profile, like the first post, press Next, repeat — exactly the way you would by hand.',
    actions: ['Like', 'Comment', 'Follow', 'Unfollow'],
    highlights: ['In-place profile walk through the post popup', 'Sources: profiles, followers, following, hashtags, locations, commenters, likers', 'Post-age and skip-video filters'],
    site: 'instagram.com', zip: 'aurora-instagram-latest.zip',
  },
  {
    id: 'tiktok', slug: 'tiktok', name: 'Aurora for TikTok', short: 'TikTok', accent: '#fe2c55', accent2: '#25f4ee',
    tagline: 'Like, comment and follow across creators, hashtags and comment sections with a steady, human rhythm.',
    actions: ['Like', 'Comment', 'Follow', 'Unfollow'],
    highlights: ['Sources: profiles, followers, following, hashtags, video commenters', 'Daily action cap and per-step delay', 'Live target list with skip'],
    site: 'tiktok.com', zip: 'aurora-tiktok-latest.zip',
  },
];

export const PRODUCT_IDS = PRODUCTS.map(p => p.id);
export const getProduct = (id: string) => PRODUCTS.find(p => p.id === id);

export const COMMON_FEATURES = [
  { icon: '👁', title: 'Preview first, always', text: 'Every task starts in Preview. Aurora shows what it would do without sending a single like, comment or follow.' },
  { icon: '🧭', title: 'Human pacing', text: 'Configurable delays, random variation, typed-out comments and a daily action cap keep activity steady and calm.' },
  { icon: '🛡', title: 'Safety stops', text: 'It pauses on captchas, warnings and anything unexpected, and never repeats an uncertain action on its own.' },
  { icon: '📊', title: 'Live progress', text: 'Target 2 of 5, next in 24s, a live target list, and a one-click “skip this target”.' },
  { icon: '💾', title: 'Saved setups', text: 'Save any configuration, reload it in one click, or reset the whole form to factory defaults.' },
  { icon: '🔒', title: 'Your data stays yours', text: 'Everything runs in your own browser and logged-in tab. Aurora never asks for your social passwords.' },
];

/** The free 3-in-1 data extractor. Not part of the paid license; downloaded directly (no account needed). */
export const EXTRACT = {
  name: 'Aurora Extract',
  version: '0.2.1',
  zip: '/downloads/aurora-extract-latest.zip',
  tagline: 'Collect public data from Facebook, Instagram and TikTok — and download the photos and videos — into a clean spreadsheet.',
  platforms: [
    { id: 'facebook' as const, items: ['Pages & profiles with public email, phone and website', 'Group members and group info', 'Group, page and profile posts with photos and videos', 'Comments, people who commented, people who reacted', 'Friends, followers and following lists', 'Marketplace listings, prices, sellers and photos'] },
    { id: 'instagram' as const, items: ['Profiles with business email, phone and website', 'Posts and reels with full-size photos and real video files', 'Followers and following lists', 'Comments, people who commented, people who liked', 'Hashtag pages'] },
    { id: 'tiktok' as const, items: ['Profiles with bio contacts and stats', 'Videos with captions, hashtags, stats and the video file', 'Followers and following lists', 'Comments and people who commented', 'Hashtag and search pages'] },
  ],
  exports: ['CSV', 'Excel (.xlsx)', 'JSON', 'Photos & videos as ZIP'],
};
