#!/usr/bin/env node
import { parseArgs } from "node:util";
import { errorMessage } from "../lib/errors.js";
import { clean, reportClean, type CleanOptions } from "./clean.js";
import { runDoctor } from "./doctor.js";
import { printFindings, printSummary, style } from "./report.js";
import {
  reportScaffold,
  scaffold,
  ScaffoldError,
  type ScaffoldOptions,
} from "./scaffold.js";
import {
  TEMPLATE_DESCRIPTIONS,
  TEMPLATE_NAMES,
  type TemplateName,
} from "./templates.js";
import { loadRepo } from "./workspace.js";

/**
 * Monorepo CLI.
 *
 * Uses `node:util`'s `parseArgs` rather than a CLI framework. The surface is three
 * commands with a handful of flags, and a dependency-free tool is one less thing
 * that can break the repo it exists to maintain.
 */

const USAGE = `${style.bold("retro")} — monorepo tools

${style.bold("Usage")}
  retro <command> [options]

${style.bold("Commands")}
  doctor              Validate the workspace graph and repo conventions
  clean               Remove build output and, optionally, node_modules
  new <name>          Scaffold a new app or package

${style.bold("doctor")}
  --json              Emit findings as JSON for CI
  --quiet             Print only the summary

${style.bold("clean")}
  --dry-run           Report what would be removed without removing it
  --deps              Also remove node_modules
  --verbose           List every path rather than a per-kind summary

${style.bold("new")}
  --template <name>   ${TEMPLATE_NAMES.join(" | ")} (default: library)
  --apps              Create under apps/ instead of packages/
  --description <s>   One-line description
  --dry-run           Report what would be created without writing

${style.bold("Examples")}
  retro doctor
  retro clean --dry-run
  retro clean --deps
  retro new token-lint --template mcp-server
`;

async function commandDoctor(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      json: { type: "boolean", default: false },
      quiet: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  const repo = await loadRepo();
  const findings = await runDoctor(repo);

  if (values.json === true) {
    process.stdout.write(`${JSON.stringify({ findings }, null, 2)}\n`);
    return findings.some((finding) => finding.severity === "error") ? 1 : 0;
  }

  process.stdout.write(
    `${style.dim(`Checking ${repo.workspaces.length} workspaces in ${repo.root}`)}\n`,
  );

  if (values.quiet !== true) printFindings(findings);
  return printSummary(findings);
}

async function commandClean(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "dry-run": { type: "boolean", default: false },
      deps: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  const repo = await loadRepo();

  const options: CleanOptions = {
    root: repo.root,
    dryRun: values["dry-run"] === true,
    includeDependencies: values.deps === true,
    verbose: values.verbose === true,
  };

  process.stdout.write(
    `${style.dim(`Scanning ${repo.root}${options.includeDependencies ? " (including node_modules)" : ""}`)}\n`,
  );

  const result = await clean(options);
  return reportClean(result, options);
}

async function commandNew(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      template: { type: "string", default: "library" },
      apps: { type: "boolean", default: false },
      description: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const rawName = positionals[0];
  if (rawName === undefined) {
    process.stderr.write(
      `${style.red("A name is required.")}  Example: retro new token-lint --template mcp-server\n`,
    );
    return 1;
  }

  const template = values.template as TemplateName;
  if (!TEMPLATE_NAMES.includes(template)) {
    process.stderr.write(`${style.red(`Unknown template "${template}".`)}\n\n`);
    for (const name of TEMPLATE_NAMES) {
      process.stderr.write(`  ${name.padEnd(12)} ${TEMPLATE_DESCRIPTIONS[name]}\n`);
    }
    return 1;
  }

  const repo = await loadRepo();

  const options: ScaffoldOptions = {
    repo,
    template,
    rawName,
    location: values.apps === true ? "apps" : "packages",
    description:
      values.description ??
      (template === "mcp-server"
        ? "An MCP server."
        : "A TypeScript library."),
    dryRun: values["dry-run"] === true,
  };

  const result = await scaffold(options);
  return reportScaffold(result);
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "doctor":
      return commandDoctor(rest);
    case "clean":
      return commandClean(rest);
    case "new":
      return commandNew(rest);
    case "help":
    case "--help":
    case "-h":
    case undefined:
      process.stdout.write(USAGE);
      return command === undefined ? 1 : 0;
    default:
      process.stderr.write(`${style.red(`Unknown command "${command}".`)}\n\n`);
      process.stdout.write(USAGE);
      return 1;
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  // A bad request gets a plain message; anything else keeps its stack, because at
  // that point the useful information is where it broke.
  if (error instanceof ScaffoldError) {
    process.stderr.write(`${style.red("Error")} ${error.message}\n`);
  } else {
    process.stderr.write(`${style.red("Error")} ${errorMessage(error)}\n`);
    if (error instanceof Error && error.stack !== undefined) {
      process.stderr.write(`${style.dim(error.stack)}\n`);
    }
  }
  process.exitCode = 1;
}
