export const env = {
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  supabaseUrl: () => process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnon: () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseService: () => process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  stripeSecret: () => process.env.STRIPE_SECRET_KEY || '',
  stripeWebhook: () => process.env.STRIPE_WEBHOOK_SECRET || '',
  paypalClientId: () => process.env.PAYPAL_CLIENT_ID || '',
  paypalSecret: () => process.env.PAYPAL_CLIENT_SECRET || '',
  paypalWebhookId: () => process.env.PAYPAL_WEBHOOK_ID || '',
  paypalBase: () => (process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'),
  licensePrivateKey: () => process.env.LICENSE_PRIVATE_KEY_PKCS8 || '',
  chromeStoreUrl: (id: string) => process.env[`NEXT_PUBLIC_CWS_${id.toUpperCase()}`] || '',
};
export const requireEnv = (name: string, value: string) => { if (!value) throw new Error(`Missing environment variable ${name}`); return value; };
