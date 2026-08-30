import { pascalCase } from "../lib/strings.js";

/** What a template needs to know to generate a package. */
export interface TemplateContext {
  /** Full package name, e.g. `@retrojb/thing`. */
  readonly packageName: string;
  /** Directory name, e.g. `thing`. */
  readonly dirName: string;
  /** One-line description for the manifest and README. */
  readonly description: string;
  /** Scope prefix, e.g. `@retrojb`. */
  readonly scope: string;
}

/** One generated file. */
export interface GeneratedFile {
  /** Path relative to the new package directory. */
  readonly path: string;
  readonly contents: string;
}

export type TemplateName = "library" | "mcp-server";

export const TEMPLATE_NAMES: readonly TemplateName[] = [
  "library",
  "mcp-server",
];

export const TEMPLATE_DESCRIPTIONS: Record<TemplateName, string> = {
  library: "A plain TypeScript library compiled with tsc.",
  "mcp-server": "An MCP server exposing tools over stdio.",
};

/**
 * Templates are TypeScript functions returning file contents, not files on disk.
 *
 * The build is plain `tsc`, which copies nothing but `.ts` output. Template files
 * sitting in `src/` would simply not exist in `dist/`, and adding a copy step to
 * work around that is more machinery than the alternative deserves.
 */
export function renderTemplate(
  template: TemplateName,
  context: TemplateContext,
): GeneratedFile[] {
  const shared = [gitignore(), ...readme(context)];

  switch (template) {
    case "library":
      return [...libraryFiles(context), ...shared];
    case "mcp-server":
      return [...mcpServerFiles(context), ...shared];
  }
}

// -----------------------------------------------------------------------------
// Shared
// -----------------------------------------------------------------------------

function gitignore(): GeneratedFile {
  return {
    path: ".gitignore",
    contents: ["dist", "*.tsbuildinfo", ""].join("\n"),
  };
}

function readme(context: TemplateContext): GeneratedFile[] {
  return [
    {
      path: "README.md",
      contents: `# ${context.packageName}

${context.description}

## Usage

\`\`\`ts
import { placeholder } from "${context.packageName}";
\`\`\`

## Scripts

| Command                | Effect                    |
| ---------------------- | ------------------------- |
| \`npm run build\`        | Compile to \`dist/\`        |
| \`npm run check-types\`  | Type-check without output |
| \`npm run lint\`         | Lint                      |
`,
    },
  ];
}

/**
 * A manifest, serialised the way npm writes them.
 *
 * Two spaces and no trailing commas, so `npm install` and `prettier --write` do
 * not take turns reformatting it.
 */
function manifest(value: Record<string, unknown>): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const DEV_DEPENDENCIES = {
  "@types/node": "26.3.0",
  eslint: "10.9.1",
  typescript: "6.0.3",
} as const;

function baseScripts(): Record<string, string> {
  return {
    build: "tsc",
    dev: "tsc --watch --preserveWatchOutput",
    lint: "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit",
  };
}

function tsconfig(): GeneratedFile {
  return {
    path: "tsconfig.json",
    contents: manifest({
      extends: "@retrojb/typescript-config/base.json",
      compilerOptions: {
        lib: ["ES2023"],
        types: ["node"],
        outDir: "dist",
        rootDir: "src",
        sourceMap: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        exactOptionalPropertyTypes: true,
        verbatimModuleSyntax: true,
      },
      include: ["src"],
      exclude: ["node_modules", "dist"],
    }),
  };
}

function eslintConfig(entry: "base" | "node"): GeneratedFile {
  const importName = entry === "node" ? "nodeConfig" : "config";

  return {
    path: "eslint.config.mjs",
    contents: `import { ${importName} } from "@retrojb/eslint-config/${entry}";

/** @type {import("eslint").Linter.Config[]} */
export default ${importName};
`,
  };
}

// -----------------------------------------------------------------------------
// library
// -----------------------------------------------------------------------------

function libraryFiles(context: TemplateContext): GeneratedFile[] {
  return [
    {
      path: "package.json",
      contents: manifest({
        name: context.packageName,
        version: "0.0.0",
        description: context.description,
        type: "module",
        private: true,
        license: "MIT",
        main: "./dist/index.js",
        types: "./dist/index.d.ts",
        exports: { ".": "./dist/index.js" },
        files: ["dist"],
        scripts: baseScripts(),
        devDependencies: {
          "@retrojb/eslint-config": "*",
          "@retrojb/typescript-config": "*",
          ...DEV_DEPENDENCIES,
        },
        engines: { node: ">=20" },
      }),
    },
    tsconfig(),
    eslintConfig("node"),
    {
      path: "src/index.ts",
      contents: `/**
 * ${context.description}
 */

/** Replace this with the package's real surface. */
export function placeholder(): string {
  return "${context.packageName}";
}
`,
    },
  ];
}

// -----------------------------------------------------------------------------
// mcp-server
// -----------------------------------------------------------------------------

function mcpServerFiles(context: TemplateContext): GeneratedFile[] {
  const serverConst = pascalCase(context.dirName);

  return [
    {
      path: "package.json",
      contents: manifest({
        name: context.packageName,
        version: "0.0.0",
        description: context.description,
        type: "module",
        private: true,
        license: "MIT",
        bin: { [context.dirName]: "./dist/bin.js" },
        main: "./dist/index.js",
        types: "./dist/index.d.ts",
        exports: {
          ".": "./dist/index.js",
          "./server": "./dist/server.js",
        },
        files: ["dist"],
        scripts: {
          ...baseScripts(),
          start: "node dist/bin.js",
          inspect: "npx @modelcontextprotocol/inspector node dist/bin.js",
        },
        dependencies: {
          "@modelcontextprotocol/server": "2.0.0",
          zod: "4.4.3",
        },
        devDependencies: {
          "@retrojb/eslint-config": "*",
          "@retrojb/typescript-config": "*",
          ...DEV_DEPENDENCIES,
        },
        engines: { node: ">=20" },
      }),
    },
    tsconfig(),
    eslintConfig("node"),
    {
      path: "src/server.ts",
      contents: `import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export const SERVER_NAME = "${context.dirName}";
export const SERVER_VERSION = "0.0.0";

/**
 * Builds a configured server instance.
 *
 * A factory rather than a singleton because the transport entry points construct
 * one instance per connection.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "${context.description}",
    },
  );

  server.registerTool(
    "example",
    {
      title: "Example tool",
      description: "Replace this with a real tool.",
      annotations: { readOnlyHint: true, openWorldHint: false },
      inputSchema: z.object({
        subject: z.string().min(1).describe("What to greet."),
      }),
    },
    ({ subject }) => ({
      content: [{ type: "text" as const, text: \`Hello, \${subject}.\` }],
    }),
  );

  return server;
}
`,
    },
    {
      path: "src/bin.ts",
      contents: `#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

/**
 * stdio entry point.
 *
 * stdout carries the JSON-RPC stream, so a single console.log would corrupt it.
 * Every diagnostic goes to stderr.
 */
serveStdio(createServer, {
  onerror: (error) => {
    console.error(\`[\${SERVER_NAME}] \${error.stack ?? error.message}\`);
  },
});

console.error(\`\${SERVER_NAME} \${SERVER_VERSION} listening on stdio\`);
`,
    },
    {
      path: "src/index.ts",
      contents: `/**
 * Library entry point.
 *
 * Side-effect free: importing this does not start a server. The executable lives
 * in \`bin.ts\`.
 */
export { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

/** Kept so the generated package has a named export to build on. */
export const ${serverConst}Ready = true;
`,
    },
  ];
}
