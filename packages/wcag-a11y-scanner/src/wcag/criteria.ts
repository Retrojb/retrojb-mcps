import type { ConformanceLevel, SuccessCriterion, Topic } from "./types.js";

const UNDERSTANDING_BASE = "https://www.w3.org/WAI/WCAG22/Understanding";

/**
 * The success criteria this server reasons about, restated in plain language.
 *
 * This is deliberately a subset of WCAG 2.2's 87 criteria: it covers colour and
 * contrast, screen reader support, and keyboard/tab navigation. Criteria are
 * quoted in paraphrase, not verbatim — the normative text lives at
 * https://www.w3.org/TR/WCAG22/ and always wins in a disagreement.
 */
export const SUCCESS_CRITERIA: readonly SuccessCriterion[] = [
  // ---------------------------------------------------------------------------
  // Colour and contrast
  // ---------------------------------------------------------------------------
  {
    id: "1.4.1",
    name: "Use of Color",
    level: "A",
    addedIn: "2.0",
    principle: "Perceivable",
    guideline: "1.4 Distinguishable",
    topics: ["color-contrast", "screen-reader"],
    plainLanguage:
      "Never let colour be the only thing carrying a message. If you turn the page greyscale, every piece of information must still come through.",
    requirement:
      "Colour is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element.",
    howToMeet: [
      "Pair a red error border with an icon and a text message.",
      "Underline links inside body copy instead of relying on colour alone.",
      "Add shape, pattern, or direct labels to chart series rather than a colour-only legend.",
      "Give required fields a visible marker plus `required` in the markup.",
    ],
    commonFailures: [
      '"Fields in red are required" with no other indicator.',
      "A status dot that is green or red with no adjacent text.",
      "Links distinguished from surrounding text only by colour, with contrast between the two below 3:1.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/use-of-color`,
    testability: "manual",
  },
  {
    id: "1.4.3",
    name: "Contrast (Minimum)",
    level: "AA",
    addedIn: "2.0",
    principle: "Perceivable",
    guideline: "1.4 Distinguishable",
    topics: ["color-contrast"],
    plainLanguage:
      "Body text needs a contrast ratio of at least 4.5:1 against its background. Large text gets a lower bar of 3:1 because bigger glyphs are easier to resolve.",
    requirement:
      "Text and images of text have a contrast ratio of at least 4.5:1, except: large-scale text needs at least 3:1; incidental text and logotypes are exempt.",
    howToMeet: [
      "Compute the ratio with the `check_color_contrast` tool before shipping a palette.",
      "Treat 18pt (about 24px), or 14pt bold (about 18.66px), as the large-text threshold.",
      "Specify both a text colour and a background colour — leaving one to the user agent is a failure.",
      "Check every state: hover, visited, disabled-but-still-informative, and placeholder text.",
    ],
    commonFailures: [
      "Light grey placeholder or helper text around 3:1 on white.",
      "White text on a mid-tone brand colour that lands near 3.5:1.",
      "Text over a photograph or gradient with no scrim, so the ratio varies per pixel.",
      "Setting `color` without setting `background-color`.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/contrast-minimum`,
    testability: "automatable",
  },
  {
    id: "1.4.6",
    name: "Contrast (Enhanced)",
    level: "AAA",
    addedIn: "2.0",
    principle: "Perceivable",
    guideline: "1.4 Distinguishable",
    topics: ["color-contrast"],
    plainLanguage:
      "The AAA version of the contrast rule: 7:1 for body text, 4.5:1 for large text.",
    requirement:
      "Text and images of text have a contrast ratio of at least 7:1, except: large-scale text needs at least 4.5:1; incidental text and logotypes are exempt.",
    howToMeet: [
      "Target 7:1 for the default body pairing so the rest of the scale has headroom.",
      "Near-black on white (or near-white on near-black) reaches AAA comfortably.",
    ],
    commonFailures: [
      "Assuming an AA-passing palette is enough when the project committed to AAA.",
      "Mid-grey body text on white, which clears 4.5:1 but not 7:1.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/contrast-enhanced`,
    testability: "automatable",
  },
  {
    id: "1.4.11",
    name: "Non-text Contrast",
    level: "AA",
    addedIn: "2.1",
    principle: "Perceivable",
    guideline: "1.4 Distinguishable",
    topics: ["color-contrast", "keyboard"],
    plainLanguage:
      "The parts of a control that tell you it is a control — borders, icons, focus rings, chart strokes — need 3:1 against what is next to them.",
    requirement:
      "Visual information required to identify user interface components and their states, and parts of graphics required to understand the content, have a contrast ratio of at least 3:1 against adjacent colours.",
    howToMeet: [
      "Give text inputs a border that clears 3:1 against the page background.",
      "Make focus indicators clear 3:1 against the background they sit on.",
      "Check icon-only buttons: the glyph itself must clear 3:1.",
      "Check chart lines, bar edges, and data-point markers.",
    ],
    commonFailures: [
      "A 1px `#e0e0e0` input border on white, roughly 1.2:1.",
      "A toggle switch whose on/off states differ only by a low-contrast fill.",
      "A focus ring in the brand colour that fails against a dark surface.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/non-text-contrast`,
    testability: "partial",
  },

  // ---------------------------------------------------------------------------
  // Screen reader support
  // ---------------------------------------------------------------------------
  {
    id: "1.1.1",
    name: "Non-text Content",
    level: "A",
    addedIn: "2.0",
    principle: "Perceivable",
    guideline: "1.1 Text Alternatives",
    topics: ["screen-reader"],
    plainLanguage:
      "Every non-text thing needs a text equivalent that serves the same purpose. Decorative images are the exception: they get an empty alt so screen readers skip them.",
    requirement:
      "All non-text content has a text alternative that serves the equivalent purpose, except for specific cases (decoration, controls, time-based media, tests, sensory experiences, CAPTCHA).",
    howToMeet: [
      "Write `alt` text that conveys the image's function, not its appearance.",
      'Use `alt=""` for purely decorative images so assistive tech ignores them.',
      "Give an icon-only button an accessible name via `aria-label` or visually hidden text.",
      'For inline SVG, add `role="img"` plus `<title>`, or `aria-hidden="true"` when decorative.',
      "Describe complex images (charts, diagrams) in adjacent text or a linked long description.",
    ],
    commonFailures: [
      "A missing `alt` attribute, which makes screen readers announce the filename.",
      '`alt="image"` or `alt="photo.jpg"` — present but useless.',
      "Decorative images with descriptive alt text, adding noise.",
      "Information conveyed only in an image of text.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/non-text-content`,
    testability: "partial",
  },
  {
    id: "1.3.1",
    name: "Info and Relationships",
    level: "A",
    addedIn: "2.0",
    principle: "Perceivable",
    guideline: "1.3 Adaptable",
    topics: ["screen-reader"],
    plainLanguage:
      "Structure you can see must also exist in the markup. If it looks like a heading, a list, or a table, it has to be one.",
    requirement:
      "Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.",
    howToMeet: [
      "Use `h1`–`h6` for headings instead of styled `div`s.",
      "Use `ul`/`ol`/`li` for lists and `dl` for term/description pairs.",
      "Give data tables `th` cells with the right `scope`, plus a `caption`.",
      "Group related radios and checkboxes in a `fieldset` with a `legend`.",
      "Associate every form control with its label via `for`/`id`.",
    ],
    commonFailures: [
      "A bold, larger `div` acting as a heading.",
      'A layout built from tables without `role="presentation"`.',
      "A data table with no `th` cells, so screen readers cannot announce row or column context.",
      "Visual grouping with whitespace and no `fieldset`.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/info-and-relationships`,
    testability: "partial",
  },
  {
    id: "1.3.2",
    name: "Meaningful Sequence",
    level: "A",
    addedIn: "2.0",
    principle: "Perceivable",
    guideline: "1.3 Adaptable",
    topics: ["screen-reader", "keyboard"],
    plainLanguage:
      "The reading order in the DOM has to make sense, because that is the order a screen reader uses.",
    requirement:
      "When the sequence in which content is presented affects its meaning, a correct reading sequence can be programmatically determined.",
    howToMeet: [
      "Write the DOM in the order you want content read, then use CSS for visual placement.",
      "Verify with CSS disabled that the page still reads coherently.",
    ],
    commonFailures: [
      "Using `order` or `row-reverse` in flex/grid so the visual order contradicts the DOM.",
      "Absolutely positioning content into a place that does not match its DOM position.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/meaningful-sequence`,
    testability: "manual",
  },
  {
    id: "1.3.5",
    name: "Identify Input Purpose",
    level: "AA",
    addedIn: "2.1",
    principle: "Perceivable",
    guideline: "1.3 Adaptable",
    topics: ["screen-reader"],
    plainLanguage:
      "Common fields like name, email, and address should declare what they collect, so browsers and assistive tech can autofill and re-label them.",
    requirement:
      "The purpose of each input field collecting information about the user can be programmatically determined when the field maps to one of the WCAG input purposes.",
    howToMeet: [
      'Add `autocomplete="email"`, `autocomplete="given-name"`, `autocomplete="tel"`, and so on.',
      "Use the token list in WCAG section 7, Input Purposes for User Interface Components.",
    ],
    commonFailures: [
      "A checkout form with no `autocomplete` attributes at all.",
      '`autocomplete="off"` on personal-detail fields with no justification.',
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/identify-input-purpose`,
    testability: "partial",
  },
  {
    id: "2.4.2",
    name: "Page Titled",
    level: "A",
    addedIn: "2.0",
    principle: "Operable",
    guideline: "2.4 Navigable",
    topics: ["screen-reader"],
    plainLanguage:
      "Every page needs a title that describes it. It is the first thing a screen reader announces and the label users see in tab lists.",
    requirement: "Web pages have titles that describe topic or purpose.",
    howToMeet: [
      "Put the specific page topic first, the site name second: `Checkout — Retro Studio`.",
      "In a single-page app, update the title on route change.",
    ],
    commonFailures: [
      "A missing or empty `<title>`.",
      "The same generic title on every page.",
      'A framework default like "Create Next App" left in place.',
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/page-titled`,
    testability: "partial",
  },
  {
    id: "2.4.4",
    name: "Link Purpose (In Context)",
    level: "A",
    addedIn: "2.0",
    principle: "Operable",
    guideline: "2.4 Navigable",
    topics: ["screen-reader", "keyboard"],
    plainLanguage:
      "A link's destination should be clear from its own text, or from the sentence and structure around it. Screen reader users often pull up a list of links with no surrounding context.",
    requirement:
      "The purpose of each link can be determined from the link text alone, or from the link text together with its programmatically determined context.",
    howToMeet: [
      'Write the destination into the link text: "View the 2026 accessibility report".',
      "When the visible text must stay short, extend it with `aria-label` or visually hidden text.",
      "Give links that go to the same place the same accessible name.",
    ],
    commonFailures: [
      '"Click here", "Read more", and "Learn more" repeated across a page.',
      "A raw URL as link text.",
      "An icon-only link with no accessible name.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/link-purpose-in-context`,
    testability: "partial",
  },
  {
    id: "2.4.6",
    name: "Headings and Labels",
    level: "AA",
    addedIn: "2.0",
    principle: "Operable",
    guideline: "2.4 Navigable",
    topics: ["screen-reader"],
    plainLanguage:
      "Headings and labels have to actually describe the thing they sit on. Present but vague does not count.",
    requirement: "Headings and labels describe topic or purpose.",
    howToMeet: [
      "Make each heading summarise the section beneath it.",
      "Label fields by what they collect, not by their widget type.",
      'Keep labels unique within a form so "edit" buttons are distinguishable.',
    ],
    commonFailures: [
      "An empty heading element used for spacing.",
      'A page of sections all headed "Details".',
      'A row of "Edit" buttons with no indication of what each edits.',
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/headings-and-labels`,
    testability: "partial",
  },
  {
    id: "3.1.1",
    name: "Language of Page",
    level: "A",
    addedIn: "2.0",
    principle: "Understandable",
    guideline: "3.1 Readable",
    topics: ["screen-reader"],
    plainLanguage:
      "Declare the page language so screen readers load the right pronunciation rules.",
    requirement:
      "The default human language of each web page can be programmatically determined.",
    howToMeet: [
      'Set `<html lang="en">`, using a valid BCP 47 tag.',
      "Mark passages in another language with `lang` on the wrapping element (that is 3.1.2).",
    ],
    commonFailures: [
      "No `lang` attribute on `<html>`.",
      '`lang="english"` or another invalid tag.',
      "A `lang` that does not match the actual content.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/language-of-page`,
    testability: "automatable",
  },
  {
    id: "3.3.2",
    name: "Labels or Instructions",
    level: "A",
    addedIn: "2.0",
    principle: "Understandable",
    guideline: "3.3 Input Assistance",
    topics: ["screen-reader"],
    plainLanguage:
      "Every input needs a label, and any format rules need to be stated up front rather than only in an error.",
    requirement:
      "Labels or instructions are provided when content requires user input.",
    howToMeet: [
      "Pair each control with a `<label for>` or wrap it in a `<label>`.",
      "State format requirements next to the field, before submission.",
      "Attach hint text with `aria-describedby`.",
      "Mark required fields with the `required` attribute plus a visible indicator.",
    ],
    commonFailures: [
      "Using `placeholder` as the only label — it disappears on input and is inconsistently announced.",
      "A search field with only a magnifying-glass icon.",
      "Password rules revealed only after a failed submit.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/labels-or-instructions`,
    testability: "partial",
  },
  {
    id: "4.1.2",
    name: "Name, Role, Value",
    level: "A",
    addedIn: "2.0",
    principle: "Robust",
    guideline: "4.1 Compatible",
    topics: ["screen-reader", "keyboard"],
    plainLanguage:
      "Every control must expose what it is called, what kind of thing it is, and its current state. Native HTML elements do this for free; custom widgets have to do it by hand.",
    requirement:
      "For all user interface components, the name and role can be programmatically determined; states, properties, and values can be programmatically set; and changes are notified to user agents including assistive technologies.",
    howToMeet: [
      'Reach for the native element first: `<button>`, `<input type="checkbox">`, `<select>`.',
      "On a custom widget, set the role and keep state attributes such as `aria-expanded`, `aria-checked`, and `aria-selected` in sync.",
      "Give `<iframe>` a `title`.",
      "Make sure `aria-labelledby` and `aria-describedby` point at IDs that exist.",
    ],
    commonFailures: [
      "A `<div onclick>` acting as a button with no role, name, or keyboard support.",
      "A custom dropdown that never updates `aria-expanded`.",
      "`aria-labelledby` referencing a removed element.",
      "Duplicate `id` values, which break every ARIA reference to them.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/name-role-value`,
    testability: "partial",
  },
  {
    id: "4.1.3",
    name: "Status Messages",
    level: "AA",
    addedIn: "2.1",
    principle: "Robust",
    guideline: "4.1 Compatible",
    topics: ["screen-reader"],
    plainLanguage:
      'When something changes without moving focus — "3 results found", "Saved" — screen reader users need to hear it. That means a live region.',
    requirement:
      "Status messages can be programmatically determined through role or properties so assistive technologies can present them without receiving focus.",
    howToMeet: [
      'Use `role="status"` or `aria-live="polite"` for non-urgent updates.',
      'Use `role="alert"` for errors that need immediate attention.',
      "Render the live region on load and inject text into it later — regions added at the same moment as their content are often missed.",
    ],
    commonFailures: [
      "A toast notification with no live region.",
      "Search result counts that update silently.",
      "Form validation summaries that appear without announcement.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/status-messages`,
    testability: "manual",
  },

  // ---------------------------------------------------------------------------
  // Keyboard and tab navigation
  // ---------------------------------------------------------------------------
  {
    id: "2.1.1",
    name: "Keyboard",
    level: "A",
    addedIn: "2.0",
    principle: "Operable",
    guideline: "2.1 Keyboard Accessible",
    topics: ["keyboard"],
    plainLanguage:
      "Everything you can do with a mouse, you must be able to do from the keyboard. No exceptions for the interesting parts.",
    requirement:
      "All functionality is operable through a keyboard interface without requiring specific timings for individual keystrokes.",
    howToMeet: [
      "Use natively focusable elements for anything interactive.",
      'If you must make a custom control, add `tabindex="0"` and handle Enter and Space.',
      "Provide keyboard equivalents for hover-only and drag-only interactions.",
      "Test the whole flow with the mouse unplugged.",
    ],
    commonFailures: [
      "A `<div onclick>` with no `tabindex` and no key handler.",
      "A menu that only opens on `mouseover`.",
      "Drag-and-drop reordering with no keyboard alternative.",
      '`tabindex="-1"` on a control that is the only way to perform an action.',
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/keyboard`,
    testability: "partial",
  },
  {
    id: "2.1.2",
    name: "No Keyboard Trap",
    level: "A",
    addedIn: "2.0",
    principle: "Operable",
    guideline: "2.1 Keyboard Accessible",
    topics: ["keyboard"],
    plainLanguage:
      "If the keyboard can get into a component, it has to be able to get out again using the keyboard.",
    requirement:
      "If focus can be moved to a component using a keyboard, focus can be moved away using a keyboard; if it requires more than unmodified arrow, tab, or exit keys, the user is advised how.",
    howToMeet: [
      "In a modal, cycle focus within the dialog and close on Escape.",
      "Restore focus to the trigger when a dialog closes.",
      "Give embedded editors and media players a documented escape key.",
    ],
    commonFailures: [
      "A focus-trapping modal with no Escape handler and no visible close button.",
      "A third-party widget that swallows Tab indefinitely.",
      "A custom grid where arrow keys never reach the boundary.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/no-keyboard-trap`,
    testability: "manual",
  },
  {
    id: "2.4.1",
    name: "Bypass Blocks",
    level: "A",
    addedIn: "2.0",
    principle: "Operable",
    guideline: "2.4 Navigable",
    topics: ["keyboard", "screen-reader"],
    plainLanguage:
      "Give people a way to jump past the header and navigation that repeats on every page.",
    requirement:
      "A mechanism is available to bypass blocks of content that are repeated on multiple web pages.",
    howToMeet: [
      "Add a skip link as the first focusable element, pointing at the main content's id.",
      "Keep the skip link visually hidden until focused, not hidden from assistive tech.",
      "Use landmark elements — `header`, `nav`, `main`, `footer` — so AT users can jump by region.",
    ],
    commonFailures: [
      "Forty navigation links before the content, with no skip link.",
      "A skip link hidden with `display: none`, which removes it from the tab order entirely.",
      "A skip link whose target id does not exist.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/bypass-blocks`,
    testability: "partial",
  },
  {
    id: "2.4.3",
    name: "Focus Order",
    level: "A",
    addedIn: "2.0",
    principle: "Operable",
    guideline: "2.4 Navigable",
    topics: ["keyboard"],
    plainLanguage:
      "Tab order should follow the order things appear on screen and preserve meaning. Surprising jumps break people's mental model of the page.",
    requirement:
      "If a web page can be navigated sequentially and the navigation sequence affects meaning or operation, focusable components receive focus in an order that preserves meaning and operability.",
    howToMeet: [
      "Rely on DOM order — it is the default tab order and it is almost always right.",
      "When a dialog opens, move focus into it; when it closes, move focus back.",
      "Keep DOM order and visual order aligned rather than patching with `tabindex`.",
    ],
    commonFailures: [
      '`tabindex="1"` and up, which jumps those elements ahead of everything else on the page.',
      "CSS reordering (`order`, `row-reverse`) that leaves tab order out of step with the layout.",
      "Opening a modal without moving focus, so Tab continues through the page behind it.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/focus-order`,
    testability: "partial",
  },
  {
    id: "2.4.7",
    name: "Focus Visible",
    level: "AA",
    addedIn: "2.0",
    principle: "Operable",
    guideline: "2.4 Navigable",
    topics: ["keyboard", "color-contrast"],
    plainLanguage:
      "Keyboard users must be able to see where focus is. Removing the outline without replacing it is the single most common keyboard failure on the web.",
    requirement:
      "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.",
    howToMeet: [
      "Keep the browser default, or replace it with something at least as visible.",
      "Use `:focus-visible` to show a strong ring for keyboard users without a ring on mouse click.",
      "Pair `outline` with `outline-offset` so the ring reads against the component.",
      "Make sure the indicator clears 3:1 against its background (1.4.11).",
    ],
    commonFailures: [
      "`outline: none` or `outline: 0` with no replacement.",
      "`*:focus { outline: none }` in a CSS reset.",
      "A focus style that only changes background colour by a barely visible amount.",
      "A focus ring clipped by `overflow: hidden` on an ancestor.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/focus-visible`,
    testability: "partial",
  },
  {
    id: "2.4.11",
    name: "Focus Not Obscured (Minimum)",
    level: "AA",
    addedIn: "2.2",
    principle: "Operable",
    guideline: "2.4 Navigable",
    topics: ["keyboard"],
    plainLanguage:
      "When something receives focus, it must not be completely hidden behind sticky headers, cookie banners, or chat widgets.",
    requirement:
      "When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content.",
    howToMeet: [
      "Add `scroll-margin-top` matching the sticky header height so focused elements scroll clear.",
      "Keep persistent overlays out of the way, or dismissible.",
      "Tab through the page at a short viewport height and watch for elements that scroll under fixed chrome.",
    ],
    commonFailures: [
      "A sticky header covering the field that just received focus.",
      "A cookie banner pinned over the bottom of the page hiding footer links.",
      "A chat bubble sitting on top of a focused control.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/focus-not-obscured-minimum`,
    testability: "manual",
  },
  {
    id: "2.4.12",
    name: "Focus Not Obscured (Enhanced)",
    level: "AAA",
    addedIn: "2.2",
    principle: "Operable",
    guideline: "2.4 Navigable",
    topics: ["keyboard"],
    plainLanguage:
      "The stricter version of 2.4.11: no part of the focused component may be hidden by author content.",
    requirement:
      "When a user interface component receives keyboard focus, no part of the component is hidden by author-created content.",
    howToMeet: [
      "Avoid overlapping fixed content entirely, or reserve layout space for it.",
      "Size scroll offsets so the whole focused component plus its focus ring clears fixed chrome.",
    ],
    commonFailures: [
      "A sticky header clipping the top edge of a focused input.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/focus-not-obscured-enhanced`,
    testability: "manual",
  },
  {
    id: "2.4.13",
    name: "Focus Appearance",
    level: "AAA",
    addedIn: "2.2",
    principle: "Operable",
    guideline: "2.4 Navigable",
    topics: ["keyboard", "color-contrast"],
    plainLanguage:
      "Sets a measurable floor for how prominent the focus indicator has to be: roughly a 2px perimeter's worth of area, at 3:1 against the unfocused state.",
    requirement:
      "The focus indicator encloses an area at least as large as a 2 CSS pixel thick perimeter of the unfocused component, and has a contrast ratio of at least 3:1 between focused and unfocused states.",
    howToMeet: [
      "Use a 2px (or thicker) outline around the full component.",
      "Verify 3:1 between the focused and unfocused rendering of the indicator area.",
      "A two-tone ring — dark outer, light inner — works on both light and dark surfaces.",
    ],
    commonFailures: [
      "A 1px focus outline.",
      "A dotted indicator whose actual covered area falls short of the 2px perimeter.",
      "A subtle background shift as the only focus indicator.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/focus-appearance`,
    testability: "manual",
  },
  {
    id: "2.5.8",
    name: "Target Size (Minimum)",
    level: "AA",
    addedIn: "2.2",
    principle: "Operable",
    guideline: "2.5 Input Modalities",
    topics: ["keyboard"],
    plainLanguage:
      "Clickable targets need to be at least 24 by 24 CSS pixels, or spaced far enough apart that a 24px circle around each one does not overlap its neighbours.",
    requirement:
      "Targets have an area of at least 24 by 24 CSS pixels, except where spacing, equivalents, inline position, user-agent control, or essential presentation applies.",
    howToMeet: [
      "Size icon buttons to at least 24x24, and prefer 44x44 for touch.",
      "Where the visual target must stay small, extend the hit area with padding or a pseudo-element.",
      "Space adjacent small targets at least 24px apart, centre to centre.",
    ],
    commonFailures: [
      "A 16x16 close button.",
      "Tightly packed pagination links.",
      "Table row action icons butted up against each other.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/target-size-minimum`,
    testability: "manual",
  },
  {
    id: "3.2.1",
    name: "On Focus",
    level: "A",
    addedIn: "2.0",
    principle: "Understandable",
    guideline: "3.2 Predictable",
    topics: ["keyboard"],
    plainLanguage:
      "Tabbing onto something must not change context by itself. Focus is navigation, not activation.",
    requirement:
      "When any user interface component receives focus, it does not initiate a change of context.",
    howToMeet: [
      "Open menus and popovers on activation, not on focus.",
      "Never submit a form or navigate from a focus handler.",
      "Use `autofocus` sparingly, and only where it is clearly expected.",
    ],
    commonFailures: [
      "A `<select>` that navigates on focus rather than on change and confirmation.",
      "A modal that opens as soon as a field receives focus.",
      "Focus moving the page to a different URL.",
    ],
    understandingUrl: `${UNDERSTANDING_BASE}/on-focus`,
    testability: "manual",
  },
];

/** Index for O(1) lookup by criterion id. */
const BY_ID = new Map<string, SuccessCriterion>(
  SUCCESS_CRITERIA.map((criterion) => [criterion.id, criterion]),
);

/** Returns the criterion with the given dotted id, if this server covers it. */
export function getCriterion(id: string): SuccessCriterion | undefined {
  return BY_ID.get(id.trim());
}

/** Every criterion id this server knows about, in specification order. */
export function knownCriterionIds(): string[] {
  return SUCCESS_CRITERIA.map((criterion) => criterion.id);
}

export interface CriteriaQuery {
  readonly topics?: readonly Topic[] | undefined;
  /** Include criteria at this level and everything below it. */
  readonly upToLevel?: ConformanceLevel | undefined;
  /** Case-insensitive match against name, plain language, and requirement. */
  readonly search?: string | undefined;
}

const LEVEL_RANK: Record<ConformanceLevel, number> = { A: 1, AA: 2, AAA: 3 };

/**
 * Filters the knowledge base.
 *
 * `upToLevel` is cumulative the way WCAG conformance is: asking for `AA`
 * returns both A and AA criteria, because AA conformance requires meeting both.
 */
export function queryCriteria(query: CriteriaQuery = {}): SuccessCriterion[] {
  const needle = query.search?.trim().toLowerCase();
  const maxRank =
    query.upToLevel === undefined ? undefined : LEVEL_RANK[query.upToLevel];

  return SUCCESS_CRITERIA.filter((criterion) => {
    if (maxRank !== undefined && LEVEL_RANK[criterion.level] > maxRank) {
      return false;
    }

    if (query.topics && query.topics.length > 0) {
      const overlaps = query.topics.some((topic) =>
        criterion.topics.includes(topic),
      );
      if (!overlaps) return false;
    }

    if (needle) {
      const haystack = [
        criterion.id,
        criterion.name,
        criterion.plainLanguage,
        criterion.requirement,
        ...criterion.howToMeet,
        ...criterion.commonFailures,
      ]
        .join("\n")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });
}

/** Resolves criterion ids to full records, dropping ids outside this subset. */
export function expandCriteria(
  ids: readonly string[],
): { id: string; name: string; level: ConformanceLevel }[] {
  const seen = new Set<string>();
  const out: { id: string; name: string; level: ConformanceLevel }[] = [];

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const criterion = BY_ID.get(id);
    if (criterion) {
      out.push({
        id: criterion.id,
        name: criterion.name,
        level: criterion.level,
      });
    }
  }

  return out;
}
