import { pluralize } from "../lib/strings.js";

export type Severity = "error" | "warning" | "info";

/** One thing the doctor noticed. */
export interface Finding {
  readonly severity: Severity;
  /** Stable identifier, e.g. `"dangling-workspace-dep"`. */
  readonly rule: string;
  /** Workspace name, or `null` for repo-level findings. */
  readonly workspace: string | null;
  readonly message: string;
  /** What to do about it. */
  readonly remedy: string;
  /** Repo-relative path to the file at fault, when there is one. */
  readonly file?: string;
}

/**
 * Whether to emit colour.
 *
 * Honours `NO_COLOR` and only colours a TTY, so piping into a file or a CI log
 * does not fill it with escape sequences.
 */
const useColor =
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb" &&
  process.stdout.isTTY === true;

function paint(code: string, text: string): string {
  return useColor ? `\u001B[${code}m${text}\u001B[0m` : text;
}

export const style = {
  bold: (text: string) => paint("1", text),
  dim: (text: string) => paint("2", text),
  red: (text: string) => paint("31", text),
  green: (text: string) => paint("32", text),
  yellow: (text: string) => paint("33", text),
  blue: (text: string) => paint("34", text),
  cyan: (text: string) => paint("36", text),
};

const SEVERITY_LABEL: Record<Severity, string> = {
  error: style.red("error"),
  warning: style.yellow("warn"),
  info: style.blue("info"),
};

/**
 * Prints findings grouped by workspace.
 *
 * Grouped rather than flat because the question a reader has is "what is wrong
 * with this package", and a flat list interleaved across eight workspaces makes
 * that harder to answer than it needs to be.
 */
export function printFindings(findings: readonly Finding[]): void {
  if (findings.length === 0) return;

  const groups = new Map<string, Finding[]>();
  for (const finding of findings) {
    const key = finding.workspace ?? "(repo)";
    const bucket = groups.get(key) ?? [];
    bucket.push(finding);
    groups.set(key, bucket);
  }

  for (const [workspace, group] of [...groups].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    process.stdout.write(`\n${style.bold(workspace)}\n`);

    for (const finding of group) {
      const location = finding.file === undefined ? "" : style.dim(` ${finding.file}`);
      process.stdout.write(
        `  ${SEVERITY_LABEL[finding.severity]}  ${finding.message}${location}\n`,
      );
      process.stdout.write(`         ${style.dim(finding.remedy)}\n`);
      process.stdout.write(`         ${style.dim(`rule: ${finding.rule}`)}\n`);
    }
  }
}

/** Prints a one-line summary and returns the process exit code. */
export function printSummary(findings: readonly Finding[]): number {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const infos = findings.filter((f) => f.severity === "info").length;

  process.stdout.write("\n");

  if (errors === 0 && warnings === 0) {
    const suffix = infos > 0 ? ` (${pluralize(infos, "note")})` : "";
    process.stdout.write(`${style.green("Workspace looks healthy")}${suffix}\n`);
    return 0;
  }

  const parts = [
    errors > 0 ? style.red(pluralize(errors, "error")) : null,
    warnings > 0 ? style.yellow(pluralize(warnings, "warning")) : null,
    infos > 0 ? pluralize(infos, "note") : null,
  ].filter((part): part is string => part !== null);

  process.stdout.write(`${parts.join(", ")}\n`);

  // Warnings alone do not fail. Some are judgement calls, and a check that
  // blocks on those trains people to pass --quiet rather than read the output.
  return errors > 0 ? 1 : 0;
}
