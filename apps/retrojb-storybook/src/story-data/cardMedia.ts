/*
 * Illustrations for the card stories, as SVG data URIs so the stories need no
 * network and no asset pipeline.
 *
 * Each is deliberately a different aspect ratio from the cards it goes in, so the
 * stories show `object-cover` cropping rather than an image that happens to fit.
 */
const svg = (body: string, width: number, height: number): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">${body}</svg>`,
  )}`;

/** Three peaks at dusk. Square, so a 16:9 card crops top and bottom. */
const MOUNTAINS = svg(
  `<rect width="600" height="600" fill="#2f1141"/>
   <circle cx="430" cy="170" r="60" fill="#dfbff6"/>
   <path d="M0 600 L170 260 L300 470 L410 300 L600 600 Z" fill="#795293"/>
   <path d="M0 600 L120 420 L240 600 Z" fill="#5b3673"/>`,
  600,
  600,
);

/** Abstract bands. Very wide, so a square card crops the sides. */
const BANDS = svg(
  `<rect width="1200" height="300" fill="#ebd6fd"/>
   <rect y="80" width="1200" height="60" fill="#956fb1"/>
   <rect y="180" width="1200" height="40" fill="#177923"/>`,
  1200,
  300,
);

export { BANDS, MOUNTAINS };
