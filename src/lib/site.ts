// Where the site lives, for absolute URLs in metadata, the sitemap and OG images.
// On Vercel, VERCEL_PROJECT_PRODUCTION_URL is set automatically (e.g. nextline.vercel.app);
// set NEXT_PUBLIC_SITE_URL once you have a custom domain.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "Nextline";
export const TAGLINE = "A focus timer that remembers where your head was.";
export const DESCRIPTION =
  "Write one line about what you're working on, start the timer, and note your next step when you stop. Next time, pick up exactly where you left off with one key.";
