import { create } from "storybook/theming";

export default create({
  base: "light",
  brandTitle: "RetroJB",
  brandImage: "/showcase-row.svg",
  brandUrl: "https://github.com/Retrojb",
  brandTarget: "_blank",

  colorPrimary: "#d1d1d1",
  colorSecondary: "#5b3673",

  appBg: "#d1d1d1",
  appContentBg: "#d1d1d1",
  appPreviewBg: "#d1d1d1",
  appBorderColor: "#795293",
  appBorderRadius: 4,

  // Text colors
  textColor: "#070507",
  textInverseColor: "#d1d1d1",

  // Toolbar default and active colors
  barTextColor: "#9E9E9E",
  barSelectedColor: "#dfbff6",
  barHoverColor: "#dfbff6",
  barBg: "#d1d1d1",

  // Form colors
  inputBg: "#d1d1d1",
  inputBorder: "#2f1141",
  inputTextColor: "#2f1141",
  inputBorderRadius: 2,
});
