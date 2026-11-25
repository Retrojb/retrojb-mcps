/**
 * The MCP surface the AI agent sees.
 *
 * One tool per useful Figma operation, each a thin wrapper over
 * {@link BridgeServer.command}. The tools are the agent's whole view of Figma, so
 * their descriptions carry real weight: a model picks a tool from its description
 * alone, and a vague one produces a model that calls the wrong thing or gives up.
 *
 * Two conventions throughout:
 *
 * - **Failures come back as readable text, not exceptions.** A tool that throws
 *   gives the model a protocol error it cannot act on. A tool that returns "no
 *   Figma file is connected, open the plugin" tells it what to say to the user.
 * - **Every tool is annotated** with `readOnlyHint` so a client can distinguish
 *   inspection from mutation without parsing descriptions.
 */

import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { BridgeServer } from "./bridge-server.js";
import { METHODS } from "../shared/protocol.js";

export const SERVER_NAME = "kiro-figma-bridge";
export const SERVER_VERSION = "0.1.0";

const INSTRUCTIONS = `Reads and manipulates the Figma file the user currently has open, through the Kiro Figma Bridge plugin.

Start with figma_status to confirm a file is connected, then figma_get_selection to see what the user is pointing at. Most design questions are answered fastest by reading the selection rather than searching the whole file.

Node ids look like "123:456" and come from figma_get_selection, figma_find_nodes, or figma_get_document. When you mention a specific layer to the user, call figma_highlight so they can see which one you mean.

Searches and component listings default to the open page. Pass scope "document" only when the answer really requires every page, because that forces Figma to load the entire file and can take a long time.`;

/** Wraps a value as a pretty-printed JSON text block. */
function json(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

/** Wraps a failure as text the model can relay to the user. */
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

/** Shared schema fragment for tools that can target a specific file. */
const documentIdSchema = z
  .string()
  .optional()
  .describe(
    "Target a specific file by its bridge document id, from figma_status. Omit to use the most recently connected file, which is normally the one the user is looking at.",
  );

const scopeSchema = z
  .enum(["page", "document"])
  .default("page")
  .describe(
    'Where to look. "page" is the open page and is fast. "document" covers every page but forces Figma to load the whole file, which is slow on a large one.',
  );

/**
 * Builds the MCP server for a running bridge.
 *
 * Takes the bridge rather than creating it, because the transport entry point
 * owns the bridge's lifetime and may build several server instances against one
 * bridge — `serveStdio` constructs one instance per connection.
 */
export function createMcpServer(bridge: BridgeServer): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

  /** Registers a tool that forwards straight to a plugin command. */
  const forward = (
    name: string,
    config: {
      title: string;
      description: string;
      readOnly: boolean;
      inputSchema: z.ZodType;
    },
    method: string,
    toParams: (args: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    server.registerTool(
      name,
      {
        title: config.title,
        description: config.description,
        annotations: {
          readOnlyHint: config.readOnly,
          // Nothing here reaches beyond the user's own open file.
          openWorldHint: false,
        },
        inputSchema: config.inputSchema,
      },
      async (args: unknown) => {
        const input = (args ?? {}) as Record<string, unknown>;
        const documentId =
          typeof input.documentId === "string" ? input.documentId : undefined;

        try {
          const result = await bridge.command(method, toParams(input), {
            documentId,
          });
          return json(result);
        } catch (error) {
          return failure(error);
        }
      },
    );
  };

  // ---------------------------------------------------------------------------
  // Connection state
  // ---------------------------------------------------------------------------

  server.registerTool(
    "figma_status",
    {
      title: "Bridge status",
      description:
        "Which Figma files are connected to this bridge, the Figma account it is acting for, and whether each editor allows edits. Call this first, and whenever a tool reports that nothing is connected.",
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({}),
    },
    () => {
      const health = bridge.health();
      const sessions = bridge.sessionList();

      return json({
        port: bridge.port,
        serverVersion: health.serverVersion,
        requiresPairing: health.requiresPairing,
        owner: health.owner,
        connectedFiles: sessions.map((session) => ({
          documentId: session.document?.documentId ?? null,
          fileName: session.document?.fileName ?? null,
          currentPage: session.document?.currentPage ?? null,
          editorType: session.document?.editorType ?? null,
          paired: session.authenticated,
          figmaUser: session.figmaUser?.name ?? null,
          userMatchesToken: session.userMatch,
          requestsServed: session.commandCount,
        })),
        hint:
          sessions.length === 0
            ? `No file is connected. Ask the user to open the "Kiro Figma Bridge" plugin in Figma; it finds this server on port ${bridge.port} automatically.`
            : null,
      });
    },
  );

  server.registerTool(
    "figma_recent_activity",
    {
      title: "Recent activity",
      description:
        "Selection changes, page changes, and edits observed in the connected file since the plugin connected. Use this to notice what the user has been doing rather than re-reading the whole file.",
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        documentId: documentIdSchema,
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(20)
          .describe("How many of the most recent events to return."),
      }),
    },
    (args) => {
      const events = bridge.recentEvents(args.documentId, args.limit);
      return json({
        count: events.length,
        latestSelection: bridge.latestSelection(args.documentId),
        events: events.map((entry) => ({
          at: new Date(entry.receivedAt).toISOString(),
          type: entry.event.type,
          data: entry.event.data,
        })),
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  forward(
    "figma_get_document",
    {
      title: "Get document overview",
      description:
        "The connected file's name, its pages, and which page is open. A cheap orientation call before searching.",
      readOnly: true,
      inputSchema: z.object({ documentId: documentIdSchema }),
    },
    METHODS.getDocumentInfo,
    () => ({}),
  );

  forward(
    "figma_get_selection",
    {
      title: "Get selection",
      description:
        "The layers the user currently has selected, with each one's type, size, position, and the layer path that locates it in the file. This is usually the right first question to ask about a design.",
      readOnly: true,
      inputSchema: z.object({ documentId: documentIdSchema }),
    },
    METHODS.getSelection,
    () => ({}),
  );

  forward(
    "figma_get_node",
    {
      title: "Get a layer",
      description:
        "Full properties of one layer: fills, strokes, effects, text style, auto-layout, constraints, and bound variables. Set depth to include descendants, but keep it low — a depth of 3 on a dense frame is thousands of layers.",
      readOnly: true,
      inputSchema: z.object({
        nodeId: z
          .string()
          .min(1)
          .describe('The layer id, for example "123:456".'),
        depth: z
          .number()
          .int()
          .min(0)
          .max(6)
          .default(1)
          .describe(
            "How many levels of children to include. 0 is the layer alone.",
          ),
        documentId: documentIdSchema,
      }),
    },
    METHODS.getNode,
    (input) => ({ nodeId: input.nodeId, depth: input.depth }),
  );

  forward(
    "figma_find_nodes",
    {
      title: "Find layers",
      description:
        "Searches layers by name substring, by type, or both. Give a name when you know roughly what it is called, a type to enumerate a category. Returns ids you can pass to figma_get_node or figma_highlight.",
      readOnly: true,
      inputSchema: z.object({
        name: z
          .string()
          .optional()
          .describe("Case-insensitive substring of the layer name."),
        type: z
          .string()
          .optional()
          .describe(
            "Figma node type, for example FRAME, TEXT, COMPONENT, INSTANCE, RECTANGLE.",
          ),
        limit: z.number().int().min(1).max(200).default(50),
        scope: scopeSchema,
        documentId: documentIdSchema,
      }),
    },
    METHODS.findNodes,
    (input) => ({
      name: input.name,
      type: input.type,
      limit: input.limit,
      scope: input.scope,
    }),
  );

  forward(
    "figma_get_components",
    {
      title: "List components",
      description:
        "Components and component sets defined in the file, with their keys and descriptions. Use this to learn a design system's vocabulary before writing code against it.",
      readOnly: true,
      inputSchema: z.object({
        scope: scopeSchema,
        documentId: documentIdSchema,
      }),
    },
    METHODS.getLocalComponents,
    (input) => ({ scope: input.scope }),
  );

  forward(
    "figma_get_variables",
    {
      title: "List variables",
      description:
        "Local variables and their collections, with the value of each variable in every mode. This is the direct source for design tokens: colours, spacing, radii, and typography defined as variables.",
      readOnly: true,
      inputSchema: z.object({ documentId: documentIdSchema }),
    },
    METHODS.getLocalVariables,
    () => ({}),
  );

  forward(
    "figma_get_styles",
    {
      title: "List styles",
      description:
        "Local paint, text, effect, and grid styles with their values. Use alongside figma_get_variables — many files define tokens as styles rather than variables, or as both.",
      readOnly: true,
      inputSchema: z.object({ documentId: documentIdSchema }),
    },
    METHODS.getLocalStyles,
    () => ({}),
  );

  // ---------------------------------------------------------------------------
  // Image export — its own handler, because the result is not JSON
  // ---------------------------------------------------------------------------

  server.registerTool(
    "figma_export_image",
    {
      title: "Export a layer as an image",
      description:
        "Renders a layer and returns it as an image you can look at directly. Use this when the visual result matters and property values do not answer the question — checking spacing by eye, or confirming what a component actually looks like.",
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        nodeId: z.string().min(1).describe("The layer id to render."),
        format: z
          .enum(["PNG", "JPG", "SVG"])
          .default("PNG")
          .describe("PNG for most things, SVG for icons and vector artwork."),
        scale: z
          .number()
          .min(0.1)
          .max(4)
          .default(2)
          .describe("Pixel density for PNG and JPG. Ignored for SVG."),
        documentId: documentIdSchema,
      }),
    },
    async (args) => {
      try {
        const result = (await bridge.command(
          METHODS.exportNodeImage,
          { nodeId: args.nodeId, format: args.format, scale: args.scale },
          { documentId: args.documentId },
        )) as {
          base64: string;
          mimeType: string;
          name: string;
          format: string;
        };

        // SVG is text, and returning it as an image block would leave the model
        // unable to read the markup it most likely wants.
        if (result.format === "SVG") {
          return {
            content: [
              {
                type: "text" as const,
                text: base64ToUtf8(result.base64),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "image" as const,
              data: result.base64,
              mimeType: result.mimeType,
            },
          ],
        };
      } catch (error) {
        return failure(error);
      }
    },
  );

  // ---------------------------------------------------------------------------
  // Canvas navigation
  // ---------------------------------------------------------------------------

  forward(
    "figma_highlight",
    {
      title: "Highlight layers",
      description:
        "Marks layers on the user's canvas so they can see which ones you are talking about. Call this whenever you name a specific layer in your reply. It does not modify the file.",
      readOnly: true,
      inputSchema: z.object({
        nodeIds: z
          .array(z.string().min(1))
          .min(1)
          .describe("Layer ids to mark."),
        reason: z
          .string()
          .default("referenced by the agent")
          .describe(
            "Short note shown in the plugin window, for the user's benefit.",
          ),
        documentId: documentIdSchema,
      }),
    },
    METHODS.highlightNodes,
    (input) => ({ nodeIds: input.nodeIds, reason: input.reason }),
  );

  forward(
    "figma_clear_highlight",
    {
      title: "Clear highlights",
      description: "Removes any markers this bridge drew on the canvas.",
      readOnly: true,
      inputSchema: z.object({ documentId: documentIdSchema }),
    },
    METHODS.clearHighlight,
    () => ({}),
  );

  forward(
    "figma_set_selection",
    {
      title: "Select layers",
      description:
        "Replaces the user's canvas selection. Prefer figma_highlight for pointing something out; use this when the user asked to be taken to a layer so they can act on it. Selection is not saved into the file.",
      readOnly: false,
      inputSchema: z.object({
        nodeIds: z
          .array(z.string().min(1))
          .describe("Layer ids to select. Empty clears."),
        documentId: documentIdSchema,
      }),
    },
    METHODS.setSelection,
    (input) => ({ nodeIds: input.nodeIds }),
  );

  forward(
    "figma_scroll_to",
    {
      title: "Scroll to layers",
      description:
        "Moves the user's viewport to bring the given layers into view.",
      readOnly: false,
      inputSchema: z.object({
        nodeIds: z.array(z.string().min(1)).min(1),
        documentId: documentIdSchema,
      }),
    },
    METHODS.scrollAndZoom,
    (input) => ({ nodeIds: input.nodeIds }),
  );

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  forward(
    "figma_rename_layer",
    {
      title: "Rename a layer",
      description:
        'Renames one layer. Requires the user to have turned on "Allow document edits" in the plugin window; without that this returns an explanation rather than renaming anything.',
      readOnly: false,
      inputSchema: z.object({
        nodeId: z.string().min(1),
        name: z.string().min(1).describe("The new layer name."),
        documentId: documentIdSchema,
      }),
    },
    METHODS.renameNode,
    (input) => ({ nodeId: input.nodeId, name: input.name }),
  );

  return server;
}

/**
 * Decodes base64 to a UTF-8 string.
 *
 * The plugin base64-encodes every export so one code path covers binary and text,
 * and SVG has to be turned back into markup here.
 */
function base64ToUtf8(base64: string): string {
  return Buffer.from(base64, "base64").toString("utf8");
}
