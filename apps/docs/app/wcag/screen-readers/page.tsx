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
  title: "Screen readers",
  description:
    "How screen readers read a page, and what your markup has to say for text alternatives, structure, names, and roles to work.",
};

export default function ScreenReadersPage(): React.ReactElement {
  return (
    <article>
      <h1>Screen readers</h1>
      <Intro>
        A screen reader does not read your page. It reads the accessibility tree
        the browser builds from your markup. Anything you conveyed with styling
        alone is not in that tree, and therefore does not exist.
      </Intro>

      <Criteria
        ids={[
          "1.1.1",
          "1.3.1",
          "2.4.2",
          "2.4.4",
          "2.4.6",
          "3.1.1",
          "3.3.2",
          "4.1.2",
          "4.1.3",
        ]}
      />

      <Section id="mental-model" title="The mental model">
        <p>
          For every element, the browser derives up to four things and hands
          them to assistive technology:
        </p>
        <ul>
          <li>
            <strong>Role</strong> — what kind of thing it is. A button, a
            heading, a list, a region.
          </li>
          <li>
            <strong>Name</strong> — what it is called. Read aloud when focus
            reaches it.
          </li>
          <li>
            <strong>State and properties</strong> — expanded or collapsed,
            checked, required, invalid, disabled.
          </li>
          <li>
            <strong>Value</strong> — the current contents, for inputs and
            sliders.
          </li>
        </ul>
        <p>
          Native HTML elements supply all four for free. Everything you build
          out of <code>div</code> and <code>span</code> supplies none of them,
          and you have to add every one by hand — including keeping the state
          attributes in sync as the user interacts.
        </p>

        <Callout label="The first rule of ARIA" variant="tip">
          <p>
            Do not use ARIA. Use the native element. A{" "}
            <code>&lt;button&gt;</code> is focusable, announces its role, fires
            on Enter and Space, and works with voice control and switch access,
            all without a line of JavaScript.{" "}
            <code>role=&quot;button&quot;</code> on a <code>div</code> gets you
            the announcement and nothing else. ARIA is for the cases HTML
            genuinely does not cover.
          </p>
        </Callout>

        <p>
          Screen reader users also rarely read top to bottom. They jump: pull up
          a list of headings to find a section, a list of links to find a
          destination, a list of landmarks to skip to the content, a list of
          form fields to fill out a form. Every one of those lists is generated
          from your markup, which is why structure matters more than it looks
          like it should.
        </p>
      </Section>

      <Section id="text-alternatives" title="Text alternatives (1.1.1)">
        <p>
          Every non-text element needs a text equivalent that serves the{" "}
          <em>same purpose</em> — not a description of how it looks. The same
          photograph needs different alt text depending on why it is on the
          page.
        </p>

        <TableFigure caption="Deciding what alt text an image needs">
          <thead>
            <tr>
              <th scope="col">The image is…</th>
              <th scope="col">What to write</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Purely decorative</th>
              <td>
                <code>alt=&quot;&quot;</code> — an empty value, present. This
                tells the screen reader to skip it. Omitting <code>alt</code>{" "}
                entirely does the opposite.
              </td>
            </tr>
            <tr>
              <th scope="row">Conveying information</th>
              <td>Describe the information, not the picture.</td>
            </tr>
            <tr>
              <th scope="row">Inside a link or button</th>
              <td>Describe the destination or action, not the graphic.</td>
            </tr>
            <tr>
              <th scope="row">Text rendered as an image</th>
              <td>Reproduce the text exactly.</td>
            </tr>
            <tr>
              <th scope="row">A chart or diagram</th>
              <td>
                Short <code>alt</code> naming what it shows, with the detail in
                adjacent text or a linked description.
              </td>
            </tr>
            <tr>
              <th scope="row">Already described by nearby text</th>
              <td>
                <code>alt=&quot;&quot;</code>, so the same thing is not
                announced twice.
              </td>
            </tr>
          </tbody>
        </TableFigure>

        <Compare
          avoid={`<img src="team.jpg">
<img src="chart.png" alt="chart.png">
<img src="spacer.gif" alt="spacer">
<img src="logo.svg" alt="Image of the Acme logo">

<a href="/cart">
  <img src="cart.svg" alt="shopping cart icon">
</a>

<svg viewBox="0 0 24 24">
  <path d="…" />
</svg>`}
          avoidNote="No alt means the filename gets read out. Filenames and 'image of' prefixes add noise. The cart link describes the graphic instead of where it goes."
          good={`<img src="team.jpg" alt="">
<img src="chart.png"
     alt="Revenue grew 40% between 2024 and 2026">
<img src="spacer.gif" alt="">
<img src="logo.svg" alt="Acme">

<a href="/cart">
  <img src="cart.svg" alt="Basket, 3 items">
</a>

<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="…" />
</svg>`}
          goodNote="Decorative images are explicitly empty. The chart states its finding. The link describes its destination. The decorative SVG is hidden."
        />

        <p>
          Inline <code>&lt;svg&gt;</code> needs deciding either way. If it means
          something, give it <code>role=&quot;img&quot;</code> and a{" "}
          <code>&lt;title&gt;</code> or <code>aria-label</code>. If it is
          decoration — which icons next to visible text almost always are — mark
          it <code>aria-hidden=&quot;true&quot;</code>. Left alone, screen
          readers announce it inconsistently or not at all.
        </p>
      </Section>

      <Section id="structure" title="Structure has to be real (1.3.1)">
        <p>
          If it looks like a heading, it must be a heading. Styling alone puts
          nothing in the accessibility tree.
        </p>

        <Compare
          avoid={`<div class="h2">Billing details</div>

<div class="list">
  <div class="row">Standard</div>
  <div class="row">Express</div>
</div>

<table>
  <tr><td>Plan</td><td>Price</td></tr>
  <tr><td>Pro</td><td>$20</td></tr>
</table>

<p>Delivery speed</p>
<input type="radio" name="s"> Standard
<input type="radio" name="s"> Express`}
          avoidNote="None of this reaches the accessibility tree. The heading is invisible to a headings list, the list has no item count, the table has no header context, and the radios have no question attached."
          good={`<h2>Billing details</h2>

<ul>
  <li>Standard</li>
  <li>Express</li>
</ul>

<table>
  <caption>Plan pricing</caption>
  <thead>
    <tr><th scope="col">Plan</th><th scope="col">Price</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">Pro</th><td>$20</td></tr>
  </tbody>
</table>

<fieldset>
  <legend>Delivery speed</legend>
  <input type="radio" name="s" id="std">
  <label for="std">Standard</label>
  <input type="radio" name="s" id="exp">
  <label for="exp">Express</label>
</fieldset>`}
          goodNote="Announced as 'heading level 2', 'list, 2 items', a table with row and column headers, and a group with a name."
        />

        <h3>Headings form an outline</h3>
        <p>
          Use one <code>h1</code> for what the page is about, then nest levels
          without skipping. Jumping from <code>h2</code> to <code>h4</code>{" "}
          reads as a missing section to someone navigating by level. Never pick
          a level for its font size — that is what CSS is for.
        </p>

        <h3>Landmarks let people skip</h3>
        <p>
          <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>,{" "}
          <code>&lt;main&gt;</code>, <code>&lt;aside&gt;</code>, and{" "}
          <code>&lt;footer&gt;</code> become navigable regions. Exactly one{" "}
          <code>&lt;main&gt;</code> per page. When there are several{" "}
          <code>&lt;nav&gt;</code> elements, name them —{" "}
          <code>aria-label=&quot;Primary&quot;</code>,{" "}
          <code>aria-label=&quot;Breadcrumb&quot;</code> — so the list of
          landmarks is not three identical entries.
        </p>
      </Section>

      <Section id="names" title="Names, roles, and values (4.1.2)">
        <p>
          A control with no accessible name is announced as just
          &quot;button&quot; or &quot;edit text&quot;. The name is computed from
          the first of these that produces something:
        </p>
        <ol>
          <li>
            <code>aria-labelledby</code> — points at other elements&apos; text
          </li>
          <li>
            <code>aria-label</code>
          </li>
          <li>
            The host-language source: <code>&lt;label for&gt;</code>,{" "}
            <code>alt</code>, <code>&lt;legend&gt;</code>,{" "}
            <code>&lt;caption&gt;</code>, <code>value</code>
          </li>
          <li>The element&apos;s own text content, for roles that allow it</li>
          <li>
            <code>title</code> — a last resort, and invisible to touch users
          </li>
        </ol>
        <p>
          Earlier sources <em>override</em> later ones. An{" "}
          <code>aria-label</code> on a button silently replaces its visible
          text, which is how you end up with a button that says one thing and
          announces another. If both exist, the visible text should be contained
          in the accessible name.
        </p>

        <Compare
          avoid={`<button><svg>…</svg></button>

<input type="text" placeholder="Email address">

<div role="button" onclick="toggle()">Menu</div>

<div class="dropdown">
  <div onclick="open()">Choose a plan</div>
</div>`}
          avoidNote="An unnamed icon button. A placeholder standing in for a label. A role with no keyboard access. A dropdown with no role, name, or state."
          good={`<button aria-label="Close dialog"><svg aria-hidden="true">…</svg></button>

<label for="email">Email address</label>
<input type="text" id="email" autocomplete="email">

<button type="button" onclick="toggle()">Menu</button>

<button type="button"
        aria-expanded="false"
        aria-controls="plan-list">
  Choose a plan
</button>
<ul id="plan-list" hidden>…</ul>`}
          goodNote="Names are explicit, the native button brings keyboard support with it, and aria-expanded reports state — which JavaScript must keep updated."
        />

        <Callout label="State must actually change" variant="warn">
          <p>
            <code>aria-expanded=&quot;false&quot;</code> that never becomes{" "}
            <code>&quot;true&quot;</code> is worse than no attribute at all: it
            actively tells the user the menu is closed while they are looking at
            it open. The same goes for <code>aria-checked</code>,{" "}
            <code>aria-selected</code>, and <code>aria-invalid</code>.
          </p>
        </Callout>
      </Section>

      <Section id="labels" title="Labels and instructions (3.3.2)">
        <p>
          Every input needs a persistent label, and any format requirement has
          to be stated before the user submits rather than only in the error.
        </p>
        <p>
          A <code>placeholder</code> is not a label. It disappears the moment
          someone types, it is announced inconsistently across screen readers,
          and its default contrast usually fails 1.4.3 as well. If you need the
          space, use a floating label that stays visible.
        </p>
        <ul>
          <li>
            Associate labels with <code>for</code> matching the input&apos;s{" "}
            <code>id</code>, or wrap the input in the <code>&lt;label&gt;</code>
            .
          </li>
          <li>
            Attach hint text with <code>aria-describedby</code> so it is
            announced after the label.
          </li>
          <li>
            Mark required fields with the <code>required</code> attribute plus a
            visible indicator — and say what the indicator means.
          </li>
          <li>
            Add <code>autocomplete</code> tokens on personal-detail fields
            (1.3.5). It enables autofill and lets assistive tech relabel fields
            in terms the user recognises.
          </li>
        </ul>
      </Section>

      <Section id="page-level" title="Page language and title (3.1.1, 2.4.2)">
        <p>
          Two one-line fixes with outsized effect.{" "}
          <code>&lt;html lang=&quot;en&quot;&gt;</code> tells the screen reader
          which pronunciation rules to load — without it, English read by a
          Spanish voice is close to unintelligible. And{" "}
          <code>&lt;title&gt;</code> is the first thing announced on load, plus
          the label in tab lists and browser history.
        </p>
        <p>
          Put the specific part first: <code>Checkout — Acme</code> beats{" "}
          <code>Acme — Checkout</code>, because a user with fifteen tabs open
          sees only the first few characters. In a single-page app, update the
          title on every route change.
        </p>
      </Section>

      <Section id="status-messages" title="Status messages (4.1.3)">
        <p>
          When something changes without focus moving — &quot;3 results
          found&quot;, &quot;Saved&quot;, &quot;Item added to basket&quot; — a
          sighted user sees it and a screen reader user hears nothing. Live
          regions fix that.
        </p>

        <Compare
          avoid={`<!-- Injected after the action; never announced -->
<div class="toast">Saved</div>`}
          avoidNote="A region that appears at the same moment as its text is usually missed entirely."
          good={`<!-- Present from page load, empty -->
<div role="status" aria-live="polite" id="toast"></div>

<script>
  // Text injected into the existing region
  document.getElementById('toast').textContent = 'Saved';
</script>`}
          goodNote="role=status for routine updates, role=alert for errors needing immediate attention. Render the container on load and change only its contents."
        />
      </Section>

      <Section id="testing" title="How to test">
        <p>
          Turn one on. It takes fifteen minutes and finds more than any tool.
        </p>
        <ul>
          <li>
            <strong>macOS</strong> — VoiceOver, <kbd>Cmd</kbd> + <kbd>F5</kbd>.
            Built in. Navigate with <kbd>Ctrl</kbd> + <kbd>Option</kbd> + arrow
            keys.
          </li>
          <li>
            <strong>Windows</strong> — NVDA, free and the most widely used.
          </li>
          <li>
            <strong>iOS / Android</strong> — VoiceOver and TalkBack, in
            accessibility settings.
          </li>
        </ul>
        <p>Then work through:</p>
        <Checklist
          items={[
            <>
              Read the page start to finish. Is anything announced that should
              be silent, or announced twice?
            </>,
            <>
              Pull up the headings list. Does it work as a table of contents?
            </>,
            <>
              Pull up the links list. Is every entry meaningful with no
              surrounding context?
            </>,
            <>
              Tab through a form. Is each field&apos;s purpose, format, and
              required status announced before you type?
            </>,
            <>
              Submit it with errors. Is the problem announced, and can you get
              to the field it refers to?
            </>,
            <>
              Trigger a background update — filter, search, add to cart. Is it
              announced?
            </>,
          ]}
        />

        <Callout label="Scan the markup first" variant="tip">
          <p>
            <Link href="/wcag/scanner">wcag-a11y-scanner</Link>&apos;s{" "}
            <code>audit_html</code> tool catches the mechanical failures —
            missing alt, unlabelled controls, skipped heading levels, broken
            ARIA references, duplicate ids — so your manual pass can focus on
            the judgement calls.
          </p>
        </Callout>
      </Section>
    </article>
  );
}
