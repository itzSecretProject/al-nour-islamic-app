// Central registry of selectable app logos. PNG logos are used for the installed
// PWA / iOS icon; the SVG logos render crisply in-app and in the Android/desktop
// manifest (iOS keeps the static PNG apple-touch-icon).
export type AppLogo = 'default' | 'golden-crescent' | 'crescent-star' | 'mosque' | 'star8';

export const LOGO_URLS: Record<AppLogo, string> = {
  'default': '/icon-512.png',
  'golden-crescent': '/al_nour_logo.png',
  'crescent-star': '/logo-crescent-star.svg',
  'mosque': '/logo-mosque.svg',
  'star8': '/logo-star8.svg',
};

export function logoUrl(id: string): string {
  return (LOGO_URLS as Record<string, string>)[id] || LOGO_URLS.default;
}
