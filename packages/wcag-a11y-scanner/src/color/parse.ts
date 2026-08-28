import { NAMED_COLORS } from "./named-colors.js";

/** An sRGB colour with a straight (non-premultiplied) alpha channel. */
export interface Rgba {
  /** Red, 0-255. */
  readonly r: number;
  /** Green, 0-255. */
  readonly g: number;
  /** Blue, 0-255. */
  readonly b: number;
  /** Alpha, 0-1. */
  readonly a: number;
}

/** Thrown when a colour string cannot be interpreted. */
export class ColorParseError extends Error {
  constructor(input: string) {
    super(
      `Could not parse "${input}" as a colour. Supported formats: hex (#rgb, #rgba, #rrggbb, #rrggbbaa), ` +
        `rgb()/rgba(), hsl()/hsla(), CSS named colours, and "transparent".`,
    );
    this.name = "ColorParseError";
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round255 = (value: number): number => clamp(Math.round(value), 0, 255);

/**
 * Reads a colour channel that may be an absolute number or a percentage.
 *
 * @param token - e.g. `"128"`, `"50%"`.
 * @param scale - the value `100%` maps to.
 */
function parseChannel(token: string, scale: number): number | undefined {
  const text = token.trim();
  if (text.length === 0) return undefined;

  if (text.endsWith("%")) {
    const pct = Number.parseFloat(text.slice(0, -1));
    if (!Number.isFinite(pct)) return undefined;
    return (pct / 100) * scale;
  }

  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : undefined;
}

/** Reads an alpha value, which may be `0.5` or `50%`. */
function parseAlpha(token: string | undefined): number {
  if (token === undefined) return 1;
  const value = parseChannel(token, 1);
  return value === undefined ? 1 : clamp(value, 0, 1);
}

/**
 * Splits the inside of a functional colour notation into components.
 *
 * Handles both the legacy comma form (`rgb(0, 0, 0, 0.5)`) and the modern
 * slash form (`rgb(0 0 0 / 50%)`).
 */
function splitComponents(body: string): { parts: string[]; alpha?: string } {
  const [main, slashAlpha] = body.split("/");
  const source = (main ?? "").trim();

  const parts = source.includes(",")
    ? source.split(",").map((part) => part.trim())
    : source.split(/\s+/).filter((part) => part.length > 0);

  // In the legacy comma form a 4th component is the alpha.
  if (slashAlpha === undefined && parts.length === 4) {
    const alpha = parts.pop();
    return alpha === undefined ? { parts } : { parts, alpha };
  }

  const trimmedAlpha = slashAlpha?.trim();
  return trimmedAlpha === undefined
    ? { parts }
    : { parts, alpha: trimmedAlpha };
}

/** Expands shorthand hex notation and converts to {@link Rgba}. */
function parseHex(input: string): Rgba | undefined {
  const hex = input.slice(1);
  const isHexDigits = /^[0-9a-f]+$/i.test(hex);
  if (!isHexDigits) return undefined;

  let full: string;
  if (hex.length === 3 || hex.length === 4) {
    full = hex
      .split("")
      .map((char) => char + char)
      .join("");
  } else if (hex.length === 6 || hex.length === 8) {
    full = hex;
  } else {
    return undefined;
  }

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  const a = full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}

/** An HSL colour: hue in degrees, saturation and lightness as 0-1 fractions. */
export interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/** Converts HSL to sRGB. `h` in degrees, `s` and `l` as 0-1 fractions. */
export function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = l - chroma / 2;

  let rgb: [number, number, number];
  if (hue < 60) rgb = [chroma, secondary, 0];
  else if (hue < 120) rgb = [secondary, chroma, 0];
  else if (hue < 180) rgb = [0, chroma, secondary];
  else if (hue < 240) rgb = [0, secondary, chroma];
  else if (hue < 300) rgb = [secondary, 0, chroma];
  else rgb = [chroma, 0, secondary];

  return {
    r: round255((rgb[0] + match) * 255),
    g: round255((rgb[1] + match) * 255),
    b: round255((rgb[2] + match) * 255),
  };
}

/** Strips a trailing CSS angle unit and normalises the value to degrees. */
function parseHue(token: string): number | undefined {
  const text = token.trim().toLowerCase();
  const match = /^(-?[\d.]+)(deg|grad|rad|turn)?$/.exec(text);
  if (!match) return undefined;

  const value = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(value)) return undefined;

  switch (match[2]) {
    case "grad":
      return value * 0.9;
    case "rad":
      return (value * 180) / Math.PI;
    case "turn":
      return value * 360;
    default:
      return value;
  }
}

/**
 * Parses a CSS colour string into sRGB with alpha.
 *
 * Supports hex (3, 4, 6, and 8 digit), `rgb()`/`rgba()`, `hsl()`/`hsla()` in
 * both legacy comma and modern space/slash syntax, the CSS named colours, and
 * `transparent`.
 *
 * Wide-gamut and computed notations (`lab()`, `oklch()`, `color-mix()`,
 * `currentColor`, `var()`) are intentionally out of scope: they cannot be
 * resolved without a full CSS engine, and silently guessing at them would
 * produce contrast numbers that look authoritative and are wrong.
 *
 * @throws {ColorParseError} when the input cannot be interpreted.
 */
export function parseColor(input: string): Rgba {
  const text = input.trim().toLowerCase();
  if (text.length === 0) throw new ColorParseError(input);

  if (text === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const named = NAMED_COLORS[text];
  if (named !== undefined) {
    const parsed = parseHex(named);
    if (parsed) return parsed;
  }

  if (text.startsWith("#")) {
    const parsed = parseHex(text);
    if (parsed) return parsed;
    throw new ColorParseError(input);
  }

  const fn = /^(rgba?|hsla?)\((.*)\)$/s.exec(text);
  if (!fn) throw new ColorParseError(input);

  const name = fn[1] ?? "";
  const { parts, alpha } = splitComponents(fn[2] ?? "");
  if (parts.length !== 3) throw new ColorParseError(input);

  const a = parseAlpha(alpha);

  if (name.startsWith("rgb")) {
    const channels = parts.map((part) => parseChannel(part, 255));
    if (channels.some((channel) => channel === undefined)) {
      throw new ColorParseError(input);
    }
    return {
      r: round255(channels[0] as number),
      g: round255(channels[1] as number),
      b: round255(channels[2] as number),
      a,
    };
  }

  const h = parseHue(parts[0] as string);
  const s = parseChannel(parts[1] as string, 1);
  const l = parseChannel(parts[2] as string, 1);
  if (h === undefined || s === undefined || l === undefined) {
    throw new ColorParseError(input);
  }

  return { ...hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1)), a };
}

/**
 * Converts sRGB to HSL.
 *
 * Used to walk a colour's lightness while holding its hue and saturation
 * steady, which is how {@link module:color/contrast} proposes fixes that still
 * look like the original brand colour.
 */
export function rgbToHsl({ r, g, b }: Rgba): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));

  let h: number;
  if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
  else h = 60 * ((rn - gn) / delta + 4);

  return { h: ((h % 360) + 360) % 360, s, l };
}

/** Formats a colour as 6-digit hex, discarding alpha. */
export function toHex({ r, g, b }: Rgba): string {
  const hex = (value: number): string =>
    round255(value).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Formats a colour as `rgb()` or `rgba()` depending on its alpha. */
export function toCssString(color: Rgba): string {
  const { r, g, b, a } = color;
  if (a >= 1) return `rgb(${round255(r)}, ${round255(g)}, ${round255(b)})`;
  return `rgba(${round255(r)}, ${round255(g)}, ${round255(b)}, ${Number(a.toFixed(3))})`;
}

/**
 * Composites a translucent colour over an opaque backdrop using the standard
 * source-over operator.
 *
 * WCAG contrast is defined between two opaque colours, so any alpha in the
 * foreground has to be resolved against something before a ratio means
 * anything. The backdrop's own alpha is ignored — it is treated as the final
 * rendered surface.
 */
export function flattenOver(foreground: Rgba, backdrop: Rgba): Rgba {
  const alpha = clamp(foreground.a, 0, 1);
  if (alpha >= 1) return { ...foreground, a: 1 };

  const blend = (fg: number, bg: number): number =>
    round255(fg * alpha + bg * (1 - alpha));

  return {
    r: blend(foreground.r, backdrop.r),
    g: blend(foreground.g, backdrop.g),
    b: blend(foreground.b, backdrop.b),
    a: 1,
  };
}
