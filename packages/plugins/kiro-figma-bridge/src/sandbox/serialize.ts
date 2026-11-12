/**
 * Converts Figma values into something that survives the trip to the agent.
 *
 * Two boundaries stand between a Figma node and the AI agent, and a raw node
 * fails both: `postMessage` structural cloning into the plugin iframe, and
 * `JSON.stringify` onto the WebSocket. Figma nodes are host objects with getters,
 * circular parent references, and methods, so they must be flattened first.
 *
 * The depth limit is not just about size. A `FrameNode` reachable from its own
 * `parent` chain will walk the entire document if followed, so an unbounded
 * serialiser turns one innocent `GET_NODE` into a full-file traversal that hangs
 * the plugin.
 */

/** Deepest nesting level retained before a value is replaced with a marker. */
const MAX_DEPTH = 12;

/** Longest array retained in full. */
const MAX_ARRAY = 200;

/**
 * Property names never read off a node.
 *
 * `parent` and `masterComponent` create cycles. The rest are either functions or
 * large derived payloads that the agent has no use for and which cost real time
 * to compute on a big node.
 */
const SKIPPED_KEYS = new Set([
  "parent",
  "masterComponent",
  "children",
  "absoluteTransform",
  "relativeTransform",
  "fillGeometry",
  "strokeGeometry",
  "vectorPaths",
  "vectorNetwork",
]);

/**
 * Recursively converts `value` to JSON-safe data.
 *
 * Cycles are tracked with a `WeakSet` rather than by depth alone, so a node
 * reachable by two paths is reported as a cycle rather than silently duplicated.
 */
export function toSerializable(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;

  const type = typeof value;
  if (type === "string" || type === "boolean") return value;

  if (type === "number") {
    const numeric = value as number;
    // JSON has no representation for these, and `JSON.stringify` turns them into
    // `null` without complaint. Figma produces `Infinity` for the dimensions of
    // some degenerate nodes, so this is reachable.
    return Number.isFinite(numeric) ? numeric : String(numeric);
  }

  if (type === "symbol" || type === "function") return undefined;
  // JSON cannot carry a bigint at all — `JSON.stringify` throws on one rather
  // than dropping it — so it becomes a decimal string.
  if (typeof value === "bigint") return value.toString();

  if (depth >= MAX_DEPTH) return "[max depth]";

  return serializeObject(value, depth, new WeakSet());
}

function serializeObject(
  value: object,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      const items = value
        .slice(0, MAX_ARRAY)
        .map((item) => walk(item, depth + 1, seen));
      if (value.length > MAX_ARRAY) {
        items.push(`[${value.length - MAX_ARRAY} more of ${value.length}]`);
      }
      return items;
    }

    if (value instanceof Uint8Array) {
      return `[${value.length} bytes]`;
    }

    const out: Record<string, unknown> = {};

    for (const key of readableKeys(value)) {
      if (SKIPPED_KEYS.has(key)) continue;

      let raw: unknown;
      try {
        raw = (value as Record<string, unknown>)[key];
      } catch {
        // Figma throws on some properties depending on node type and on whether
        // the containing page is loaded. An inaccessible property is not an
        // error worth failing the whole command over.
        continue;
      }

      const converted = walk(raw, depth + 1, seen);
      if (converted !== undefined) out[key] = converted;
    }

    return out;
  } finally {
    seen.delete(value);
  }
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return null;

  const type = typeof value;
  if (type === "string" || type === "boolean") return value;
  if (type === "number") {
    const numeric = value as number;
    return Number.isFinite(numeric) ? numeric : String(numeric);
  }
  if (type === "symbol" || type === "function") return undefined;
  if (typeof value === "bigint") return value.toString();

  if (depth >= MAX_DEPTH) return "[max depth]";
  return serializeObject(value, depth, seen);
}

/**
 * Enumerable keys of a Figma node.
 *
 * Node properties live on the prototype as accessors, so `Object.keys` returns
 * almost nothing for them. Walking the prototype chain is what actually reaches
 * `name`, `width`, `fills` and the rest.
 */
function readableKeys(value: object): string[] {
  const keys = new Set(Object.keys(value));

  let prototype: object | null = Object.getPrototypeOf(value) as object | null;
  while (prototype !== null && prototype !== Object.prototype) {
    for (const [key, descriptor] of Object.entries(
      Object.getOwnPropertyDescriptors(prototype),
    )) {
      // Accessors only. A prototype's own methods and its constructor are not
      // data and would serialise to `undefined` anyway.
      if (typeof descriptor.get === "function") keys.add(key);
    }
    prototype = Object.getPrototypeOf(prototype) as object | null;
  }

  keys.delete("constructor");
  return [...keys];
}
