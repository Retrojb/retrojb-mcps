import { addons } from "storybook/manager-api";
import retrojbTheme from "./retrojbTheme";

addons.setConfig({
  theme: retrojbTheme,
  enableShortcuts: true,
  sidebar: {
    showRoots: true,
    collapsedRoots: ["Foundations"],
  },
});
