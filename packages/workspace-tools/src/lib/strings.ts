/**
 * String helpers.
 *
 * `truncate` exists here because it existed three times in
 * `@retrojb/wcag-a11y-scanner` — and in two subtly different variants, one of
 * which collapsed whitespace first and one of which did not. That divergence is
 * the actual argument for a shared module: three copies is tolerable, three
 * copies that disagree is a bug waiting to be noticed.
 */

/** Collapses runs of whitespace to single spaces and trims the ends. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export interface TruncateOptions {
  /**
   * Collapse whitespace before measuring. Defaults to `false`.
   *
   * Worth being explicit about: markup-derived text is full of newlines and
   * indentation, so measuring it raw truncates far earlier than it appears to.
   */
  readonly collapse?: boolean;
  /** Appended when truncation happens, and counted toward `max`. Defaults to `…`. */
  readonly ellipsis?: string;
}

/**
 * Shortens `text` to at most `max` characters, including the ellipsis.
 *
 * The length guarantee is the point — callers use this to keep values inside
 * fixed-width output and protocol limits, so exceeding `max` would defeat it.
 */
export function truncate(
  text: string,
  max: number,
  options: TruncateOptions = {},
): string {
  const ellipsis = options.ellipsis ?? "…";
  const source = options.collapse === true ? collapseWhitespace(text) : text;

  if (max <= 0) return "";
  if (source.length <= max) return source;
  // Degenerate case: no room for content alongside the ellipsis.
  if (max <= ellipsis.length) return source.slice(0, max);

  return source.slice(0, max - ellipsis.length) + ellipsis;
}

/**
 * Converts to `kebab-case`.
 *
 * Used to turn a human-supplied package name into a directory name during
 * scaffolding, so it has to be aggressive about characters that are illegal in a
 * path or an npm name.
 */
export function kebabCase(text: string): string {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_.]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/** Converts to `PascalCase`, for generated type and component names. */
export function pascalCase(text: string): string {
  return kebabCase(text)
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** Converts to `camelCase`, for generated identifiers. */
export function camelCase(text: string): string {
  const pascal = pascalCase(text);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * `count` with `singular` or `plural`, e.g. `pluralize(1, "file")` -> `"1 file"`.
 *
 * Only here because every CLI command needs it and getting it wrong reads as
 * sloppy in the one place users actually look.
 */
export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Formats a byte count as a short human-readable string. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
