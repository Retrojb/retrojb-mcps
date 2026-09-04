import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/ui/main.ts", "src/sandbox/main.ts"],
  clean: true,
});
