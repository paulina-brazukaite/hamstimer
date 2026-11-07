// Where the site lives, for absolute URLs in metadata, the sitemap and OG images.
// On Vercel, VERCEL_PROJECT_PRODUCTION_URL is set automatically (e.g. nextline.vercel.app);
// set NEXT_PUBLIC_SITE_URL once you have a custom domain.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "Hamstimer";
export const TAGLINE = "A focus timer that remembers where your head was.";
export const DESCRIPTION =
  "Type what you're working on, press Enter, and run a pomodoro on it. Add the next step as you go. Next time, pick up exactly where you left off with one key.";
