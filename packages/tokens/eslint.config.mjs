import { nodeConfig } from "@retrojb/eslint-config/node";

/**
 * The build script runs on Node. The stylesheets are not linted here.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [...nodeConfig, { ignores: ["dist/**"] }];
