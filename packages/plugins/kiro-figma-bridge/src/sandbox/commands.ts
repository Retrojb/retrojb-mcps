/**
 * Everything the agent can ask Figma to do.
 *
 * One entry per {@link METHODS} name. Handlers receive already-parsed params and
 * return plain JSON; the relay and the socket handle transport, and thrown errors
 * become a `{ id, error }` reply, so a handler's job is only to do the work or
 * explain clearly why it cannot.
 *
 * Two rules shape the whole registry:
 *
 * 1. **Default to the current page.** `figma.root.findAllWithCriteria` needs every
 *    page resident in memory, which under `documentAccess: "dynamic-page"` means
 *    `loadAllPagesAsync()` — tens of seconds on a large file, and Figma warns it
 *    can hit a memory ceiling. Document-wide scope is available but always
 *    explicitly requested.
 * 2. **Writes are gated.** Read handlers are always available. Anything that
 *    modifies the document checks the session's write permission first, so
 *    installing the plugin does not by itself hand an agent edit rights.
 */

import { documentId } from "./document-id.js";
import {
  isHighlightArtifact,
  resolveSceneNode,
  type NodeHighlighter,
} from "./highlight.js";
import { describeSelection } from "./selection.js";
import { toSerializable } from "./serialize.js";
import { METHODS } from "../shared/protocol.js";
import type { DocumentIdentity } from "../shared/protocol.js";
import type { BridgeSettings } from "../shared/bridge-messages.js";

/** What a handler is given access to. */
export interface CommandContext {
  readonly highlighter: NodeHighlighter;
  /** Current settings. Read per call, because the user can change them mid-session. */
  readonly settings: () => BridgeSettings;
  /** Whether the editor itself permits writes. False in Dev Mode. */
  readonly canWrite: () => boolean;
}

export type CommandHandler = (
  params: Record<string, unknown>,
) => Promise<unknown>;

/** Largest exported image returned inline, in bytes of base64. */
const MAX_IMAGE_BASE64 = 4_000_000;

/** Nodes returned by a single search. */
const MAX_SEARCH_RESULTS = 200;

// -----------------------------------------------------------------------------
// Param readers
// -----------------------------------------------------------------------------

/**
 * Reads node ids from any of the shapes a model tends to produce.
 *
 * Language models are inconsistent about singular versus plural even against a
 * published schema, and the failure is an opaque "nodeIds is required" that the
 * agent then retries verbatim. Accepting the obvious variants costs four lines
 * and removes a whole category of stuck retry loop.
 */
function readNodeIds(params: Record<string, unknown>): string[] {
  const candidate = params.nodeIds ?? params.nodeId ?? params.id ?? params.ids;

  if (typeof candidate === "string") return [candidate];
  if (Array.isArray(candidate)) {
    return candidate.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function readOneNodeId(params: Record<string, unknown>): string {
  const [first] = readNodeIds(params);
  if (first === undefined) {
    throw new Error("A nodeId is required.");
  }
  return first;
}

function readString(
  params: Record<string, unknown>,
  key: string,
): string | null {
  const value = params[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function readNumber(
  params: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Whether a command asked for document-wide scope rather than the open page. */
function readWholeDocument(params: Record<string, unknown>): boolean {
  return params.scope === "document";
}

// -----------------------------------------------------------------------------
// Document identity
// -----------------------------------------------------------------------------

/** Builds the payload sent on connect and whenever identity changes. */
export function currentDocumentInfo(): DocumentIdentity {
  const { documentId: id, persisted } = documentId();

  return {
    documentId: id,
    fileName: figma.root.name,
    currentPage: figma.currentPage.name,
    currentPageId: figma.currentPage.id,
    selectionCount: figma.currentPage.selection.length,
    editorType: figma.editorType,
    documentIdPersisted: persisted,
  };
}

// -----------------------------------------------------------------------------
// Registry
// -----------------------------------------------------------------------------

export function createCommandRegistry(
  context: CommandContext,
): Map<string, CommandHandler> {
  const registry = new Map<string, CommandHandler>();

  /** Rejects a write when the session or the editor does not allow one. */
  const assertWritable = (what: string): void => {
    if (!context.canWrite()) {
      throw new Error(
        `Cannot ${what}: this editor is read-only (Dev Mode or a view-only file).`,
      );
    }
    if (!context.settings().allowWrites) {
      throw new Error(
        `Cannot ${what}: document edits are disabled. Turn on "Allow document edits" in the Kiro Figma Bridge plugin window to permit this.`,
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  registry.set(METHODS.getDocumentInfo, () =>
    Promise.resolve({
      ...currentDocumentInfo(),
      pages: figma.root.children.map((page) => ({
        id: page.id,
        name: page.name,
        isCurrent: page.id === figma.currentPage.id,
      })),
    }),
  );

  registry.set(METHODS.getSelection, () =>
    describeSelection(figma.currentPage.selection),
  );

  registry.set(METHODS.getNode, async (params) => {
    const id = readOneNodeId(params);
    const node = await resolveSceneNode(id);
    if (node === null) {
      throw new Error(`No node with id ${id} on this document.`);
    }

    // Zero means "this node only". Kept low by default because a depth of 3 on a
    // dense frame is already thousands of nodes, and the agent can always ask
    // again for a specific child.
    const depth = Math.max(0, Math.min(readNumber(params, "depth", 1), 6));
    return describeTree(node, depth);
  });

  registry.set(METHODS.findNodes, async (params) => {
    const name = readString(params, "name");
    const type = readString(params, "type");
    const limit = Math.max(
      1,
      Math.min(readNumber(params, "limit", 50), MAX_SEARCH_RESULTS),
    );

    if (name === null && type === null) {
      throw new Error("Provide a name to match, a node type, or both.");
    }

    const scope = await searchScope(readWholeDocument(params));
    const needle = name?.toLowerCase() ?? null;

    const matches = scope.findAll((node) => {
      if (isHighlightArtifact(node.name)) return false;
      if (type !== null && node.type !== type.toUpperCase()) return false;
      if (needle !== null && !node.name.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });

    return {
      total: matches.length,
      returned: Math.min(matches.length, limit),
      nodes: matches.slice(0, limit).map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        page: pageNameOf(node),
      })),
    };
  });

  registry.set(METHODS.getLocalComponents, async (params) => {
    const scope = await searchScope(readWholeDocument(params));
    const found = scope.findAllWithCriteria({
      types: ["COMPONENT", "COMPONENT_SET"],
    });

    return {
      total: found.length,
      components: found.slice(0, MAX_SEARCH_RESULTS).map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        key: node.key,
        description: node.description,
        page: pageNameOf(node),
      })),
    };
  });

  registry.set(METHODS.getLocalVariables, async () => {
    const [collections, variables] = await Promise.all([
      figma.variables.getLocalVariableCollectionsAsync(),
      figma.variables.getLocalVariablesAsync(),
    ]);

    return {
      collections: collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        modes: collection.modes.map((mode) => ({
          id: mode.modeId,
          name: mode.name,
        })),
        defaultModeId: collection.defaultModeId,
        variableCount: collection.variableIds.length,
      })),
      variables: variables.map((variable) => ({
        id: variable.id,
        name: variable.name,
        collectionId: variable.variableCollectionId,
        resolvedType: variable.resolvedType,
        description: variable.description,
        // Keyed by mode id; the collection above is what maps those to names.
        valuesByMode: toSerializable(variable.valuesByMode),
      })),
    };
  });

  registry.set(METHODS.getLocalStyles, async () => {
    const [paints, texts, effects, grids] = await Promise.all([
      figma.getLocalPaintStylesAsync(),
      figma.getLocalTextStylesAsync(),
      figma.getLocalEffectStylesAsync(),
      figma.getLocalGridStylesAsync(),
    ]);

    const summarize = (style: BaseStyle) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      description: style.description,
    });

    return {
      paint: paints.map((style) => ({
        ...summarize(style),
        paints: toSerializable(style.paints),
      })),
      text: texts.map((style) => ({
        ...summarize(style),
        fontName: toSerializable(style.fontName),
        fontSize: style.fontSize,
        lineHeight: toSerializable(style.lineHeight),
        letterSpacing: toSerializable(style.letterSpacing),
      })),
      effect: effects.map((style) => ({
        ...summarize(style),
        effects: toSerializable(style.effects),
      })),
      grid: grids.map(summarize),
    };
  });

  registry.set(METHODS.exportNodeImage, async (params) => {
    const id = readOneNodeId(params);
    const node = await resolveSceneNode(id);
    if (node === null) {
      throw new Error(`No node with id ${id} on this document.`);
    }

    // Checked without an `in` narrowing on purpose. Every `SceneNode` declares
    // `exportAsync` in the typings, so `"exportAsync" in node` narrows the false
    // branch to `never` and makes `node.type` unreachable to the compiler — while
    // at runtime the method genuinely is missing on some nodes.
    if (typeof (node as { exportAsync?: unknown }).exportAsync !== "function") {
      throw new Error(`A ${node.type} node cannot be exported as an image.`);
    }

    const requested = (readString(params, "format") ?? "PNG").toUpperCase();
    if (requested !== "PNG" && requested !== "JPG" && requested !== "SVG") {
      throw new Error(`Unsupported format ${requested}. Use PNG, JPG, or SVG.`);
    }

    const scale = Math.max(0.1, Math.min(readNumber(params, "scale", 2), 4));

    const bytes =
      requested === "SVG"
        ? await node.exportAsync({ format: "SVG" })
        : await node.exportAsync({
            format: requested,
            constraint: { type: "SCALE", value: scale },
          });

    // `figma.base64Encode` rather than `btoa`: the sandbox realm has no `btoa`,
    // and hand-rolling base64 over a multi-megabyte buffer here would be slow.
    const base64 = figma.base64Encode(bytes);

    if (base64.length > MAX_IMAGE_BASE64) {
      throw new Error(
        `Exported image is too large to return inline (${Math.round(base64.length / 1024)} KB encoded). Retry with a smaller scale.`,
      );
    }

    return {
      nodeId: node.id,
      name: node.name,
      format: requested,
      scale: requested === "SVG" ? null : scale,
      mimeType:
        requested === "PNG"
          ? "image/png"
          : requested === "JPG"
            ? "image/jpeg"
            : "image/svg+xml",
      base64,
    };
  });

  // ---------------------------------------------------------------------------
  // Canvas navigation — changes the view, never the document
  // ---------------------------------------------------------------------------

  registry.set(METHODS.highlightNodes, async (params) => {
    const settings = context.settings();
    const outcome = await context.highlighter.highlight(readNodeIds(params), {
      mode: settings.highlightMode,
      durationMs: settings.highlightDurationMs,
      scrollIntoView: settings.scrollIntoView,
    });
    return outcome;
  });

  registry.set(METHODS.clearHighlight, () => {
    context.highlighter.clear();
    return Promise.resolve({ cleared: true });
  });

  registry.set(METHODS.setSelection, async (params) => {
    const ids = readNodeIds(params);
    const nodes: SceneNode[] = [];
    const missing: string[] = [];

    for (const id of ids) {
      const node = await resolveSceneNode(id);
      if (node === null) missing.push(id);
      else nodes.push(node);
    }

    // Selection is viewport state, not document content — it is not saved into
    // the file — so this is not gated behind write permission.
    figma.currentPage.selection = nodes;
    return { selected: nodes.map((node) => node.id), missing };
  });

  registry.set(METHODS.scrollAndZoom, async (params) => {
    const ids = readNodeIds(params);
    const nodes: SceneNode[] = [];

    for (const id of ids) {
      const node = await resolveSceneNode(id);
      if (node !== null) nodes.push(node);
    }

    if (nodes.length === 0) {
      throw new Error("None of the given node ids could be resolved.");
    }

    figma.viewport.scrollAndZoomIntoView(nodes);
    return { focused: nodes.map((node) => node.id) };
  });

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  registry.set(METHODS.renameNode, async (params) => {
    assertWritable("rename a layer");

    const id = readOneNodeId(params);
    const name = readString(params, "name");
    if (name === null) throw new Error("A new name is required.");

    const node = await resolveSceneNode(id);
    if (node === null) throw new Error(`No node with id ${id}.`);

    const previous = node.name;
    node.name = name;
    return { nodeId: node.id, previousName: previous, name };
  });

  return registry;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Chooses what to search, loading every page only when asked to.
 *
 * `figma.root.findAll*` throws under `documentAccess: "dynamic-page"` unless
 * every page is resident, so the load is mandatory for document scope — and slow
 * enough on a large file that it must never happen by accident.
 */
async function searchScope(
  wholeDocument: boolean,
): Promise<PageNode | DocumentNode> {
  if (!wholeDocument) return figma.currentPage;
  await figma.loadAllPagesAsync();
  return figma.root;
}

/** Name of the page a node sits on, for results that span pages. */
function pageNameOf(node: BaseNode): string {
  let current: BaseNode | null = node;
  while (current !== null) {
    if (current.type === "PAGE") return current.name;
    current = current.parent;
  }
  return "(unknown)";
}

/**
 * Serialises a node and its descendants to `depth` levels.
 *
 * Children are walked here rather than left to `toSerializable`, which skips
 * `children` outright — that skip is what stops a single node read from
 * traversing the whole document, and this is the controlled, bounded version of
 * the same walk.
 */
function describeTree(node: SceneNode, depth: number): unknown {
  const own = toSerializable(node) as Record<string, unknown>;

  if (depth <= 0 || !("children" in node)) {
    if ("children" in node) own.childCount = node.children.length;
    return own;
  }

  const children = node.children.filter(
    (child) => !isHighlightArtifact(child.name),
  );

  own.childCount = children.length;
  own.children = children.map((child) => describeTree(child, depth - 1));
  return own;
}
