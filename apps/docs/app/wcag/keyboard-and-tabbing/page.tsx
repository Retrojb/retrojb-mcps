import type { Metadata } from "next";
import Link from "next/link";
import {
  Callout,
  Checklist,
  Compare,
  Criteria,
  Intro,
  Section,
  TableFigure,
} from "../../_components/prose";

export const metadata: Metadata = {
  title: "Keyboard and tabbing",
  description:
    "How the tab order is determined, what tabindex does, why focus indicators matter, and how to avoid keyboard traps.",
};

export default function KeyboardPage(): React.ReactElement {
  return (
    <article>
      <h1>Keyboard and tabbing</h1>
      <Intro>
        Keyboard access is the layer nearly every other assistive technology
        sits on. Screen readers, switch access, and voice control all drive the
        page through the same focus model, so anything the keyboard cannot reach
        is unreachable by all of them.
      </Intro>

      <Criteria
        ids={[
          "2.1.1",
          "2.1.2",
          "2.4.1",
          "2.4.3",
          "2.4.7",
          "2.4.11",
          "3.2.1",
          "2.5.8",
        ]}
      />

      <Section id="who-relies-on-it" title="Who this is for">
        <p>
          Not a niche. Keyboard-only navigation is how people work when they
          have a motor impairment that makes a mouse impractical, when they use
          a screen reader, when a tremor makes small targets unhittable, when
          they are recovering from RSI — and, frequently, when they are simply
          faster at it. Power users live in the keyboard.
        </p>
      </Section>

      <Section
        id="how-tab-order-works"
        title="How the tab order is actually determined"
      >
        <p>
          There is no tab order setting. The browser builds it from two things:
        </p>
        <ol>
          <li>
            <strong>Which elements are focusable.</strong> By default, links
            with an <code>href</code>, form controls, buttons,{" "}
            <code>&lt;summary&gt;</code>, and anything with{" "}
            <code>contenteditable</code>.
          </li>
          <li>
            <strong>Their order in the DOM.</strong> Not their visual position.
            Not their <code>z-index</code>. Source order.
          </li>
        </ol>
        <p>
          Which means the default is almost always correct, and most tab-order
          bugs are self-inflicted. If the tab order is wrong, the fix is usually
          to reorder the DOM rather than to add attributes.
        </p>

        <Callout label="CSS can desynchronise the two" variant="warn">
          <p>
            <code>flex-direction: row-reverse</code>, <code>order: -1</code>,
            and grid placement change what people see without changing the tab
            order. The result is focus jumping backwards across the screen. If
            you reorder visually, reorder the DOM to match — this is 2.4.3, and
            1.3.2 for the reading order.
          </p>
        </Callout>
      </Section>

      <Section
        id="tabindex"
        title="tabindex: three values, one you should never use"
      >
        <TableFigure caption="What each tabindex value does">
          <thead>
            <tr>
              <th scope="col">Value</th>
              <th scope="col">Effect</th>
              <th scope="col">When to use it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">
                <code>0</code>
              </th>
              <td>
                Adds a non-focusable element to the tab order, in DOM position.
              </td>
              <td>
                Custom controls that cannot be a native element. Rare, and
                usually a sign you should have used a{" "}
                <code>&lt;button&gt;</code>.
              </td>
            </tr>
            <tr>
              <th scope="row">
                <code>-1</code>
              </th>
              <td>
                Removes it from the tab order, but keeps it focusable via
                script.
              </td>
              <td>
                Scripted focus targets: a dialog container you move focus into,
                or the inactive items in a widget that uses arrow keys.
              </td>
            </tr>
            <tr>
              <th scope="row">
                <code>1</code> and up
              </th>
              <td>
                Jumps the element ahead of <em>everything</em> in the natural
                order, page-wide.
              </td>
              <td>Never.</td>
            </tr>
          </tbody>
        </TableFigure>

        <p>
          Positive values create a second, earlier tab sequence layered over the
          document. Every focusable element on the page now has to be accounted
          for in a manual ordering that breaks the moment anyone adds a link.
          There is no case where this is the right tool.
        </p>

        <Compare
          avoid={`<div class="modal">
  <input tabindex="1">
  <input tabindex="2">
  <button tabindex="3">Save</button>
</div>

<div onclick="submit()">Submit</div>

<a onclick="openMenu()">Menu</a>`}
          avoidNote="Positive tabindex hijacks the whole page. The div is unreachable by keyboard. The anchor without href is neither focusable nor announced as a link."
          good={`<div class="modal">
  <input>
  <input>
  <button>Save</button>
</div>

<button type="button" onclick="submit()">Submit</button>

<button type="button" onclick="openMenu()">Menu</button>`}
          goodNote="DOM order is the tab order. Native buttons are focusable, announce their role, and fire on Enter and Space at no cost."
        />

        <p>
          If you genuinely must make a <code>div</code> interactive, you owe it
          four things: <code>role</code>, <code>tabindex=&quot;0&quot;</code>, a
          key handler for Enter <em>and</em> Space, and an accessible name. Miss
          any one and it is a 2.1.1 or 4.1.2 failure.
        </p>
      </Section>

      <Section id="focus-visible" title="Focus indicators (2.4.7)">
        <p>
          This is the most common keyboard failure on the web, and it is almost
          always deliberate: someone removed the focus outline because it looked
          untidy on mouse click. A keyboard user without a focus indicator has
          no idea where they are — it is the equivalent of hiding the mouse
          cursor.
        </p>

        <Compare
          avoid={`/* In a reset, affecting everything */
*:focus {
  outline: none;
}

.button:focus {
  outline: 0;
}`}
          avoidNote="Nothing replaces the indicator. Every keyboard user on the site is now navigating blind."
          good={`/*
 * :focus-visible applies for keyboard and programmatic
 * focus but not on mouse click — which is the actual
 * problem people were trying to solve.
 */
:focus-visible {
  outline: 2px solid #0b5cd5;
  outline-offset: 2px;
}

/* Only suppress the default where :focus-visible works. */
@supports selector(:focus-visible) {
  :focus:not(:focus-visible) {
    outline: none;
  }
}`}
          goodNote="Keyboard users get a clear indicator, mouse users get no stray ring, and older engines keep the default rather than losing it."
        />

        <p>Things to get right about the indicator itself:</p>
        <ul>
          <li>
            It must clear <strong>3:1</strong> against the background it sits on
            (1.4.11). A ring that works on white may vanish on a dark card.
          </li>
          <li>
            Use <code>outline</code> with <code>outline-offset</code> rather
            than <code>border</code>, so the element does not shift on focus.
          </li>
          <li>
            <code>outline</code> follows <code>border-radius</code> in current
            browsers, so rounded components look right.
          </li>
          <li>
            Watch for <code>overflow: hidden</code> on an ancestor clipping the
            ring.
          </li>
          <li>
            At AAA, 2.4.13 sets a measurable floor: an area at least as large as
            a 2px perimeter of the component, at 3:1 between focused and
            unfocused states. A 1px outline does not qualify.
          </li>
        </ul>
      </Section>

      <Section id="traps" title="Keyboard traps (2.1.2)">
        <p>
          If focus can get into a component, it must be able to get out using
          the keyboard alone. Modals are where this goes wrong.
        </p>
        <p>A modal dialog owes the user five behaviours:</p>
        <ol>
          <li>Focus moves into the dialog when it opens.</li>
          <li>
            Tab cycles within the dialog and does not escape to the page behind.
          </li>
          <li>
            The page behind is inert — not just visually covered. Use the native{" "}
            <code>&lt;dialog&gt;</code> element with <code>showModal()</code>,
            or the <code>inert</code> attribute on the rest of the page.
          </li>
          <li>Escape closes it.</li>
          <li>
            Focus returns to the element that opened it. Losing focus to{" "}
            <code>&lt;body&gt;</code> dumps the user back at the top of the
            page.
          </li>
        </ol>

        <Callout label="Use the platform" variant="tip">
          <p>
            <code>&lt;dialog&gt;</code> with <code>showModal()</code> handles
            the focus trap, inertness, Escape, and the backdrop for free. It is
            supported everywhere current. Hand-rolled modals are where trap bugs
            live.
          </p>
        </Callout>

        <p>
          The other common trap is a third-party embed — a code editor, a map, a
          video player — that captures Tab. If a component needs a non-obvious
          key to escape, 2.1.2 requires you to tell the user how before they
          enter it.
        </p>
      </Section>

      <Section id="skip-links" title="Skip links (2.4.1)">
        <p>
          Every page repeats its header and navigation. Without a way past them,
          a keyboard user tabs through the same forty links on every page. A
          skip link is the standard fix, and it has one classic bug.
        </p>

        <Compare
          avoid={`<a href="#main" class="skip">Skip to main content</a>

<style>
  /* Removes it from the tab order entirely */
  .skip { display: none; }
</style>`}
          avoidNote="display: none and visibility: hidden both make an element unfocusable, so the skip link can never be reached — it may as well not exist."
          good={`<a href="#main-content" class="skip">Skip to main content</a>
<main id="main-content">…</main>

<style>
  .skip {
    position: absolute;
    transform: translateY(-120%);
  }
  /* Slides into view when it receives focus */
  .skip:focus { transform: translateY(0); }
</style>`}
          goodNote="Positioned offscreen rather than hidden, so it stays focusable and is the first thing a keyboard user reaches."
        />

        <p>
          Make it the first focusable element in the document, point it at an id
          that exists, and give it a visible appearance on focus. Landmark
          elements help too: they let assistive technology jump by region
          without needing a link at all.
        </p>
      </Section>

      <Section id="focus-not-obscured" title="Focus not obscured (2.4.11)">
        <p>
          New in WCAG 2.2, at level AA. When an element receives focus, it must
          not be <em>entirely</em> hidden by content you added — which in
          practice means sticky headers, cookie banners, and chat widgets.
        </p>
        <p>
          The symptom: you tab down a long form, the browser scrolls the focused
          field into view, and the sticky header covers it. The fix is one
          property:
        </p>
        <pre>
          <code>{`html {
  /* Match your sticky header's height */
  scroll-padding-top: 5rem;
}

/* Or per-element */
:target, h2 {
  scroll-margin-top: 5rem;
}`}</code>
        </pre>
        <p>
          2.4.12 is the AAA version, where <em>no part</em> of the focused
          component may be covered.
        </p>
      </Section>

      <Section
        id="on-focus"
        title="Focus is navigation, not activation (3.2.1)"
      >
        <p>
          Moving focus to something must not change context by itself. Tabbing
          through a page is how keyboard users read it, so a menu that opens on
          focus, or a <code>&lt;select&gt;</code> that navigates on focus, makes
          the page impossible to pass through.
        </p>
        <p>
          Open things on activation — click, Enter, Space — not on{" "}
          <code>focus</code>. And be sparing with <code>autofocus</code>: it
          skips everything before it on load, which can carry a screen reader
          user past content they needed.
        </p>
      </Section>

      <Section id="target-size" title="Target size (2.5.8)">
        <p>
          Also new in 2.2 at AA: clickable targets need to be at least{" "}
          <strong>24 by 24 CSS pixels</strong>, or spaced so that a 24px circle
          centred on each does not overlap its neighbours. Exceptions cover
          inline links in text and cases where the size is essential.
        </p>
        <p>
          Where the visual target must stay small, extend the hit area with
          padding or a pseudo-element rather than shrinking the icon. For touch,
          44 by 44 is the more comfortable target.
        </p>
      </Section>

      <Section id="testing" title="How to test">
        <p>
          Put the mouse down and tab through the page. This takes five minutes
          and finds most keyboard failures.
        </p>
        <Checklist
          items={[
            <>
              Can you reach <em>every</em> control? Anything you can click but
              not tab to is a 2.1.1 failure.
            </>,
            <>
              Can you see where focus is at every single stop, on every
              background?
            </>,
            <>
              Does focus move in the order things appear on screen, with no
              jumps backwards?
            </>,
            <>
              Is the focused element ever hidden behind a sticky header or
              banner?
            </>,
            <>
              In every menu, dialog, and popover: does Escape close it, and does
              focus return to the trigger?
            </>,
            <>
              Does everything respond to Enter <em>and</em> Space, not just
              click?
            </>,
            <>
              Tab past the header — is there a skip link, and does it actually
              move focus?
            </>,
            <>
              Does tabbing onto something ever open, submit, or navigate on its
              own?
            </>,
          ]}
        />

        <Callout label="Catch the static causes first" variant="tip">
          <p>
            Focus order and focus visibility are runtime behaviours, so no
            static tool can confirm them. But the common <em>causes</em> are
            visible in markup, and{" "}
            <Link href="/wcag/scanner">wcag-a11y-scanner</Link>&apos;s{" "}
            <code>audit_html</code> flags them: positive <code>tabindex</code>,
            click handlers on unfocusable elements, suppressed outlines, broken
            skip links, and CSS reordering.
          </p>
        </Callout>
      </Section>
    </article>
  );
}
