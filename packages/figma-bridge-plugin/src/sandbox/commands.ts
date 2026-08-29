import { PLUGIN_VERSION } from "../shared/protocol.js";
import type { NodeHighlighter } from "./highlight.js";
import { ensureAllPagesLoaded } from "./page-loading.js";
import {
  describeSelection,
  serializeSelectionForHarness,
} from "./selection.js";
import { toSerializable } from "./serialize.js";

/**
 * Signature every command handler shares.
 *
 * Returns `unknown` rather than `Promise<unknown>` so handlers that do no async
 * work need not be declared `async` just to satisfy the type. The dispatcher
 * awaits the result either way, and awaiting a plain value is a no-op.
 */
type Handler = (params: Record<string, unknown>) => unknown;

export interface CommandContext {
  readonly highlighter: NodeHighlighter;
  /** Whether `EXECUTE_CODE` is permitted. User-controlled. */
  readonly isCodeExecutionEnabled: () => boolean;
  /** Reports which nodes a command touched, so the UI can show it. */
  readonly noteReferencedNodes: (
    nodeIds: readonly string[],
    reason: string,
  ) => void;
}

/** Thrown for a bad request, as opposed to a genuine execution failure. */
class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandError";
  }
}

// -----------------------------------------------------------------------------
// Parameter readers
// -----------------------------------------------------------------------------

function requireString(params: Record<string, unknown>, key: string): string {
  const value = params[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new CommandError(
      `Parameter "${key}" is required and must be a string`,
    );
  }
  return value;
}

function requireNumber(params: Record<string, unknown>, key: string): number {
  const value = params[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CommandError(
      `Parameter "${key}" is required and must be a number`,
    );
  }
  return value;
}

/**
 * Reads a node id list, accepting either `nodeIds` or a single `nodeId`.
 *
 * Both spellings appear across harness tools, and rejecting one because the
 * other was expected produces a failure the agent cannot diagnose.
 */
function readNodeIds(params: Record<string, unknown>): string[] {
  const list = params.nodeIds;
  if (Array.isArray(list)) {
    return list.filter((entry): entry is string => typeof entry === "string");
  }

  const single = params.nodeId ?? params.id;
  if (typeof single === "string") return [single];

  throw new CommandError(
    'Expected "nodeId" (string) or "nodeIds" (string array)',
  );
}

/** Resolves a node id, failing with a message naming the id. */
async function resolveNode(id: string): Promise<BaseNode> {
  const node = await figma.getNodeByIdAsync(id);
  if (node === null) throw new CommandError(`No node with id "${id}"`);
  return node;
}

async function resolveSceneNode(id: string): Promise<SceneNode> {
  const node = await resolveNode(id);
  if (node.type === "DOCUMENT" || node.type === "PAGE") {
    throw new CommandError(`Node "${id}" is a ${node.type}, not a scene node`);
  }
  return node;
}

// -----------------------------------------------------------------------------
// File and selection
// -----------------------------------------------------------------------------

export function currentFileInfo(): {
  fileName: string;
  fileKey: string | null;
  currentPage: string;
  currentPageId: string;
  selectionCount: number;
  pluginVersion: string;
  editorType: string;
} {
  return {
    fileName: figma.root.name,
    // Requires `enablePrivatePluginApi`. Null when unavailable, which the
    // harness tolerates for a single connection but not for multi-file routing.
    fileKey: figma.fileKey ?? null,
    currentPage: figma.currentPage.name,
    currentPageId: figma.currentPage.id,
    selectionCount: figma.currentPage.selection.length,
    pluginVersion: PLUGIN_VERSION,
    editorType: figma.editorType,
  };
}

// -----------------------------------------------------------------------------
// Registry
// -----------------------------------------------------------------------------

/**
 * Builds the method table the harness can call.
 *
 * This is a focused subset of the harness's full surface, not a reimplementation
 * of it. Identity, selection, node inspection, the mutations that pair naturally
 * with highlighting, and `EXECUTE_CODE` — which is the generic escape hatch the
 * harness itself relies on for most of its tools. Anything unimplemented returns
 * a listing of what is available rather than failing silently.
 */
export function createCommandRegistry(
  context: CommandContext,
): Map<string, Handler> {
  const handlers = new Map<string, Handler>();

  handlers.set("GET_FILE_INFO", () => ({ fileInfo: currentFileInfo() }));

  handlers.set("GET_SELECTION", async () => {
    const selection = figma.currentPage.selection;
    return {
      selection: serializeSelectionForHarness(selection),
      detail: await describeSelection(selection),
    };
  });

  handlers.set("GET_NODE", async (params) => {
    const ids = readNodeIds(params);
    context.noteReferencedNodes(ids, "GET_NODE");

    const nodes = await Promise.all(
      ids.map(async (id) => {
        const node = await figma.getNodeByIdAsync(id);
        return node === null
          ? { id, found: false }
          : { id, found: true, node: toSerializable(node) };
      }),
    );

    return { nodes };
  });

  handlers.set("SET_SELECTION", async (params) => {
    const ids = readNodeIds(params);
    const nodes = await Promise.all(ids.map((id) => resolveSceneNode(id)));

    figma.currentPage.selection = nodes;
    context.noteReferencedNodes(ids, "SET_SELECTION");

    return { selected: nodes.map((node) => node.id) };
  });

  handlers.set("SCROLL_AND_ZOOM", async (params) => {
    const ids = readNodeIds(params);
    const nodes = await Promise.all(ids.map((id) => resolveSceneNode(id)));

    figma.viewport.scrollAndZoomIntoView(nodes);
    context.noteReferencedNodes(ids, "SCROLL_AND_ZOOM");

    return { focused: nodes.map((node) => node.id) };
  });

  /**
   * Plugin-specific extension, outside the harness's documented surface.
   *
   * Lets an agent point a human at a node explicitly — "look at this one" —
   * rather than relying on the implicit highlight that every node-referencing
   * command already triggers.
   */
  handlers.set("HIGHLIGHT_NODES", async (params) => {
    const ids = readNodeIds(params);
    const reason =
      typeof params.reason === "string" ? params.reason : "HIGHLIGHT_NODES";

    const outcome = await context.highlighter.highlight(ids, reason);
    return outcome;
  });

  handlers.set("CLEAR_HIGHLIGHT", () => {
    context.highlighter.clear();
    return { cleared: true };
  });

  handlers.set("RENAME_NODE", async (params) => {
    const id = requireString(params, "nodeId");
    const newName = requireString(params, "name");

    const node = await resolveSceneNode(id);
    context.noteReferencedNodes([id], `RENAME_NODE -> ${newName}`);

    const previousName = node.name;
    node.name = newName;

    return { id, previousName, name: node.name };
  });

  handlers.set("RESIZE_NODE", async (params) => {
    const id = requireString(params, "nodeId");
    const width = requireNumber(params, "width");
    const height = requireNumber(params, "height");

    const node = await resolveSceneNode(id);
    if (!("resize" in node)) {
      throw new CommandError(`Node type ${node.type} cannot be resized`);
    }

    context.noteReferencedNodes([id], "RESIZE_NODE");
    node.resize(Math.max(0.01, width), Math.max(0.01, height));

    return { id, width: node.width, height: node.height };
  });

  handlers.set("MOVE_NODE", async (params) => {
    const id = requireString(params, "nodeId");
    const x = requireNumber(params, "x");
    const y = requireNumber(params, "y");

    const node = await resolveSceneNode(id);
    context.noteReferencedNodes([id], "MOVE_NODE");

    node.x = x;
    node.y = y;

    return { id, x: node.x, y: node.y };
  });

  handlers.set("DELETE_NODE", async (params) => {
    const ids = readNodeIds(params);
    // Highlight before deleting, so the overlay is drawn while the node still
    // has a bounding box to trace.
    context.noteReferencedNodes(ids, "DELETE_NODE");

    const deleted: string[] = [];
    for (const id of ids) {
      const node = await resolveSceneNode(id);
      node.remove();
      deleted.push(id);
    }

    return { deleted };
  });

  handlers.set("GET_LOCAL_COMPONENTS", async () => {
    // `figma.root.findAllWithCriteria` searches the whole document, so under
    // `documentAccess: "dynamic-page"` it throws unless every page is resident.
    // Paid here, lazily and once, rather than at startup — this is the only
    // command that needs it, and on a large file the load is slow.
    await ensureAllPagesLoaded();

    const components = figma.root.findAllWithCriteria({
      types: ["COMPONENT", "COMPONENT_SET"],
    });

    return {
      components: components.map((node) => ({
        id: node.id,
        key: "key" in node ? node.key : null,
        name: node.name,
        type: node.type,
        description: "description" in node ? node.description : null,
      })),
    };
  });

  handlers.set("GET_VARIABLES_DATA", async () => {
    const variables = await figma.variables.getLocalVariablesAsync();
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();

    return {
      success: true,
      timestamp: Date.now(),
      fileKey: figma.fileKey ?? null,
      variables: variables.map((variable) => ({
        id: variable.id,
        name: variable.name,
        key: variable.key,
        resolvedType: variable.resolvedType,
        valuesByMode: toSerializable(variable.valuesByMode),
        variableCollectionId: variable.variableCollectionId,
        description: variable.description,
        scopes: variable.scopes,
      })),
      variableCollections: collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        key: collection.key,
        modes: collection.modes.map((mode) => ({
          modeId: mode.modeId,
          name: mode.name,
        })),
        defaultModeId: collection.defaultModeId,
        variableIds: collection.variableIds,
      })),
    };
  });

  // Alias: the harness uses REFRESH_VARIABLES to force a re-read.
  const variablesHandler = handlers.get("GET_VARIABLES_DATA");
  if (variablesHandler) handlers.set("REFRESH_VARIABLES", variablesHandler);

  handlers.set("EXECUTE_CODE", async (params) => {
    if (!context.isCodeExecutionEnabled()) {
      throw new CommandError(
        "Code execution is disabled in the bridge plugin. Enable it in the plugin window to allow EXECUTE_CODE.",
      );
    }

    const code = requireString(params, "code");
    const timeoutMs =
      typeof params.timeout === "number" && params.timeout > 0
        ? params.timeout
        : 5000;

    return executeCode(code, timeoutMs);
  });

  return handlers;
}

/**
 * Runs harness-supplied code in the sandbox.
 *
 * `eval` rather than `new Function` or `AsyncFunction`: Figma's sandbox blocks
 * the function constructors but permits `eval`. Wrapping in an async IIFE is what
 * lets the supplied code use `await`, which nearly all of it does.
 *
 * The timeout bounds how long the caller waits, not how long the code runs — the
 * sandbox has no way to interrupt a running script. Code that hangs keeps
 * holding its resources after the rejection is reported.
 */
async function executeCode(code: string, timeoutMs: number): Promise<unknown> {
  const wrapped = `(async function() {\n${code}\n})()`;

  let pending: Promise<unknown>;
  try {
    // Figma's sandbox blocks the Function constructors but permits eval, so this
    // is the only way to run harness-supplied code. Gated by the user-facing
    // EXECUTE_CODE toggle; see the note on this function.
    // eslint-disable-next-line no-eval -- no alternative in this sandbox
    pending = eval(wrapped) as Promise<unknown>;
  } catch (error) {
    throw new CommandError(
      `Syntax error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let timer: number | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Execution timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  try {
    const result = await Promise.race([pending, timeout]);
    return {
      result: toSerializable(result),
      resultType: typeof result,
      isUndefined: result === undefined,
    };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}
