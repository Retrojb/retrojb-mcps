/**
 * Reduces arbitrary sandbox values to something that survives `postMessage`.
 *
 * Figma's bridge structurally clones, so a payload holding a node reference, a
 * function, or a cycle throws on send — and the throw surfaces as a generic
 * relay failure rather than pointing at the value that caused it. Command results
 * are exactly where this bites: `EXECUTE_CODE` returning `figma.currentPage`
 * is the most natural thing an agent can write.
 */

const MAX_DEPTH = 6;
const MAX_ARRAY_LENGTH = 200;
const MAX_STRING_LENGTH = 20_000;

/** A Figma node reduced to the fields worth sending. */
interface NodeSummary {
  readonly __type: "FigmaNode";
  readonly id: string;
  readonly name: string;
  readonly type: string;
}

/**
 * Converts `value` into a structurally cloneable equivalent.
 *
 * Lossy by design. Truncation and placeholder markers are preferable to a relay
 * that fails opaquely, because the caller is usually debugging when they hit it.
 */
export function toSerializable(value: unknown): unknown {
  return convert(value, 0, new WeakSet<object>());
}

function convert(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || value === undefined) return value ?? null;

  const primitive = convertPrimitive(value);
  if (primitive !== NOT_PRIMITIVE) return primitive;

  if (depth >= MAX_DEPTH) return "[Max depth reached]";

  // Cycles: a node's `parent` chain and a page's `children` array reference each
  // other, so this triggers on almost any un-summarised node graph.
  if (typeof value === "object" && seen.has(value)) return "[Circular]";
  if (typeof value === "object") seen.add(value);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => convert(item, depth + 1, seen));

    if (value.length > MAX_ARRAY_LENGTH) {
      items.push(`[${value.length - MAX_ARRAY_LENGTH} more items truncated]`);
    }
    return items;
  }

  if (value instanceof Error) {
    return { __type: "Error", name: value.name, message: value.message };
  }

  const node = asNodeSummary(value);
  if (node !== null) return node;

  return convertPlainObject(value as Record<string, unknown>, depth, seen);
}

const NOT_PRIMITIVE = Symbol("not-primitive");

function convertPrimitive(value: unknown): unknown {
  switch (typeof value) {
    case "string":
      return value.length > MAX_STRING_LENGTH
        ? `${value.slice(0, MAX_STRING_LENGTH)}… [truncated]`
        : value;
    case "number":
      // NaN and Infinity clone fine but do not survive JSON on the far side.
      return Number.isFinite(value) ? value : String(value);
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "function":
      return `[Function ${(value as { name?: string }).name || "anonymous"}]`;
    case "symbol":
      return value.toString();
    default:
      return NOT_PRIMITIVE;
  }
}

/**
 * Detects a Figma node by shape rather than `instanceof`.
 *
 * The sandbox does not expose node constructors, so structural detection is the
 * only option: an object carrying a string `id`, `name`, and `type` plus a
 * `parent` or `removed` property is a node for our purposes.
 */
function asNodeSummary(value: object): NodeSummary | null {
  const candidate = value as Record<string, unknown>;

  const looksLikeNode =
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.name === "string" &&
    ("parent" in candidate || "removed" in candidate);

  if (!looksLikeNode) return null;

  return {
    __type: "FigmaNode",
    id: candidate.id as string,
    name: candidate.name as string,
    type: candidate.type as string,
  };
}

function convertPlainObject(
  value: Record<string, unknown>,
  depth: number,
  seen: WeakSet<object>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(value)) {
    // Reading a property can throw: several Figma node getters raise when the
    // property does not apply to that node type, and a single throw would
    // otherwise lose the whole object.
    let entry: unknown;
    try {
      entry = value[key];
    } catch (error) {
      out[key] =
        `[Unreadable: ${error instanceof Error ? error.message : "error"}]`;
      continue;
    }

    if (typeof entry === "function") continue;
    out[key] = convert(entry, depth + 1, seen);
  }

  return out;
}
