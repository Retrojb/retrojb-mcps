import { nodeConfig } from "./node.js";

/**
 * This package lints itself with its own Node config — the config files here are
 * ESM modules that Node loads directly.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default nodeConfig;
