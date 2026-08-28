import type { Metadata } from "next";
import Link from "next/link";
import { LARGE_TEXT_BOLD_PX, LARGE_TEXT_PX } from "@retrojb/wcag-a11y-scanner";
import { ContrastDemo } from "../../_components/contrast-demo";
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
  title: "Colour and contrast",
  description:
    "What the WCAG contrast ratio measures, which thresholds apply to text and to controls, and how to avoid the common failures.",
};

export default function ColorContrastPage(): React.ReactElement {
  return (
    <article>
      <h1>Colour and contrast</h1>
      <Intro>
        Contrast is the one accessibility requirement with a single number
        attached, which makes it the easiest to check and the easiest to get
        subtly wrong. Here is what the number means and which threshold applies
        where.
      </Intro>

      <Criteria ids={["1.4.3", "1.4.6", "1.4.11", "1.4.1"]} />

      <Section
        id="what-the-ratio-means"
        title="What the ratio actually measures"
      >
        <p>
          A contrast ratio compares the <strong>relative luminance</strong> of
          two colours — how much light each one emits, on a scale where 0 is
          black and 1 is white. It is not a comparison of hue or saturation.
        </p>
        <pre>
          <code>{`ratio = (L1 + 0.05) / (L2 + 0.05)

L1 = relative luminance of the lighter colour
L2 = relative luminance of the darker colour`}</code>
        </pre>
        <p>
          Ratios run from <strong>1:1</strong> (two identical colours) to{" "}
          <strong>21:1</strong> (black on white). The <code>0.05</code> terms
          model the ambient light that reaches a real screen, which is why pure
          black on pure black is 1:1 rather than undefined.
        </p>

        <Callout label="Hue is not contrast" variant="warn">
          <p>
            Two colours can be wildly different and still have almost no
            contrast. Pure red <code>#ff0000</code> and pure blue{" "}
            <code>#0000ff</code> look nothing alike but sit at roughly 2.1:1 —
            well below the 4.5:1 body-text bar. Saturated mid-tones are the
            usual trap: brand colours chosen for vibrancy tend to cluster around
            the same luminance.
          </p>
        </Callout>
      </Section>

      <Section id="the-thresholds" title="The thresholds">
        <p>
          Two things decide which number you need: whether you are measuring{" "}
          <strong>text</strong> or something else, and if it is text, whether it
          counts as <strong>large</strong>.
        </p>

        <TableFigure caption="WCAG 2 contrast thresholds by content type and conformance level">
          <thead>
            <tr>
              <th scope="col">What you are measuring</th>
              <th scope="col">Level AA</th>
              <th scope="col">Level AAA</th>
              <th scope="col">Criterion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Normal-size text</th>
              <td>4.5:1</td>
              <td>7:1</td>
              <td>
                <code>1.4.3</code> / <code>1.4.6</code>
              </td>
            </tr>
            <tr>
              <th scope="row">Large text</th>
              <td>3:1</td>
              <td>4.5:1</td>
              <td>
                <code>1.4.3</code> / <code>1.4.6</code>
              </td>
            </tr>
            <tr>
              <th scope="row">
                Control boundaries, focus rings, state indicators
              </th>
              <td>3:1</td>
              <td>Not defined</td>
              <td>
                <code>1.4.11</code>
              </td>
            </tr>
            <tr>
              <th scope="row">Graphics needed to understand the content</th>
              <td>3:1</td>
              <td>Not defined</td>
              <td>
                <code>1.4.11</code>
              </td>
            </tr>
            <tr>
              <th scope="row">
                Disabled controls, decoration, logotypes, incidental text
              </th>
              <td>Exempt</td>
              <td>Exempt</td>
              <td>—</td>
            </tr>
          </tbody>
        </TableFigure>

        <p>
          There is no AAA equivalent of 1.4.11. A control boundary that clears
          3:1 has nothing further to meet, whatever level you are targeting.
        </p>
      </Section>

      <Section id="large-text" title="What counts as large text">
        <p>
          WCAG defines <em>large scale</em> text as at least{" "}
          <strong>18 point</strong>, or at least <strong>14 point bold</strong>.
          The specification states this in points; since a CSS pixel is 1/96
          inch and a point is 1/72 inch, the CSS equivalents are:
        </p>
        <ul>
          <li>
            <strong>{LARGE_TEXT_PX}px</strong> or larger at any weight
          </li>
          <li>
            <strong>{LARGE_TEXT_BOLD_PX.toFixed(2)}px</strong> or larger at
            weight 700 or heavier
          </li>
        </ul>

        <Callout label="Bold is not a licence on its own" variant="warn">
          <p>
            Bold only lowers the bar once the text is also at least 14pt. Bold
            16px text is still normal-size text and still needs 4.5:1. The size
            threshold comes first; weight only shifts where that threshold sits.
          </p>
        </Callout>

        <ContrastDemo
          caption="The same grey against white, judged at three different sizes. Ratios computed by the wcag-a11y-scanner package. Some samples deliberately fail; every verdict is also stated in text."
          examples={[
            {
              foreground: "#949494",
              background: "#ffffff",
              label: "16px body",
            },
            {
              foreground: "#949494",
              background: "#ffffff",
              label: "18px bold",
              fontSizePx: 18,
              bold: true,
            },
            {
              foreground: "#949494",
              background: "#ffffff",
              label: "24px heading",
              fontSizePx: 24,
            },
          ]}
        />
        <p>
          One colour, three verdicts. This is why a palette cannot be declared
          accessible on its own — only a colour paired with a size and a
          background can pass or fail.
        </p>
      </Section>

      <Section id="worked-examples" title="Worked examples">
        <ContrastDemo
          caption="Common pairings and where they land. Every ratio is computed at build time. Several samples deliberately fail, to show what failure looks like."
          examples={[
            { foreground: "#000000", background: "#ffffff", label: "Maximum" },
            {
              foreground: "#595959",
              background: "#ffffff",
              label: "AAA body text",
            },
            {
              foreground: "#767676",
              background: "#ffffff",
              label: "Lightest AA grey",
            },
            {
              foreground: "#999999",
              background: "#ffffff",
              label: "Typical placeholder",
            },
            {
              foreground: "#ffffff",
              background: "#0b5cd5",
              label: "White on blue",
            },
            {
              foreground: "#ffffff",
              background: "#ffc107",
              label: "White on amber",
            },
            {
              foreground: "#000000",
              background: "#ffc107",
              label: "Black on amber",
            },
            {
              foreground: "#e0e0e0",
              background: "#ffffff",
              label: "Input border",
              contentType: "ui-component",
            },
          ]}
        />
        <p>
          <code>#767676</code> is worth memorising: it is the lightest grey that
          clears 4.5:1 on white. Anything lighter fails for body text.
        </p>
        <p>
          The two amber rows show a pattern that catches people out constantly.
          Bright warning yellows are so luminous that white text on them fails
          badly, while black text on them passes comfortably. When a colour is
          light, darken the text rather than lightening it further.
        </p>
      </Section>

      <Section
        id="non-text-contrast"
        title="Non-text contrast: the rule people miss"
      >
        <p>
          1.4.11 covers everything that tells you a control exists or what state
          it is in. If a user cannot see the boundary of a text input, the input
          might as well not be there — and this is the most commonly missed
          contrast requirement, because design systems love a faint hairline
          border.
        </p>

        <Compare
          avoid={`/* 1.19:1 against white — effectively invisible */
.input {
  border: 1px solid #e0e0e0;
}

/* Focus ring the same colour as the border */
.input:focus {
  border-color: #cccccc;
}`}
          avoidNote="A border this faint fails 1.4.11, and a focus state that only shifts it slightly fails 2.4.7 as well."
          good={`/* 3.4:1 against white — clears the 3:1 floor */
.input {
  border: 1px solid #767b82;
}

.input:focus-visible {
  outline: 2px solid #0b5cd5;
  outline-offset: 2px;
}`}
          goodNote="The boundary is perceivable at rest, and focus adds a distinct 2px indicator rather than nudging the existing one."
        />

        <p>What to check under 1.4.11:</p>
        <ul>
          <li>
            Text input, select, and textarea borders against the page
            background.
          </li>
          <li>Icon-only buttons — the glyph itself, not its container.</li>
          <li>
            Focus indicators against whatever surface they land on. A ring that
            passes on white may fail on a dark card.
          </li>
          <li>
            Checkbox and radio outlines, and the checked indicator inside them.
          </li>
          <li>
            Toggle switches: the difference between on and off must be
            perceivable, not just a fill swap at the same luminance.
          </li>
          <li>Chart lines, bar edges, data point markers, and legend keys.</li>
        </ul>

        <Callout label="Adjacent, not absolute">
          <p>
            1.4.11 measures against the <em>adjacent</em> colour. A button
            border is measured against the page background behind it, not
            against the button&apos;s own fill. When a component sits on more
            than one surface across the site, it has to clear 3:1 on all of
            them.
          </p>
        </Callout>
      </Section>

      <Section id="colour-alone" title="Never let colour be the only signal">
        <p>
          1.4.1 is a separate criterion from contrast and it is about
          information, not legibility. If turning the page greyscale loses
          meaning, it fails.
        </p>

        <Compare
          avoid={`<!-- Colour is the only thing marking the error -->
<input style="border-color: red">
<p style="color: red">Fields in red are required.</p>

<!-- Status conveyed by a coloured dot alone -->
<span class="dot dot--green"></span>`}
          avoidNote="Greyscale this and the error state and the status both vanish."
          good={`<!-- Border, icon, and text all carry the message -->
<input aria-invalid="true" aria-describedby="email-error" required>
<p id="email-error">
  <svg aria-hidden="true">…</svg>
  Enter an email address, e.g. you@example.com
</p>

<!-- Status has a text label -->
<span class="dot dot--green" aria-hidden="true"></span>
<span>Operational</span>`}
          goodNote="Every signal survives greyscale, and the error is programmatically tied to its field."
        />

        <p>
          Links inside body copy are the case people forget. If a link is
          distinguished from surrounding text by colour alone, that colour
          difference has to reach 3:1 <em>against the surrounding text</em> — a
          bar most brand palettes miss. Underlining them is simpler and always
          passes.
        </p>
      </Section>

      <Section id="hard-cases" title="Cases with no single answer">
        <ul>
          <li>
            <strong>Text over photographs or gradients.</strong> The ratio
            changes pixel by pixel, so there is no single number. Measure the
            worst-case region, or guarantee a floor with a solid scrim or a
            semi-opaque overlay behind the text.
          </li>
          <li>
            <strong>Translucent colours.</strong> Contrast is only defined
            between opaque colours. An <code>rgba()</code> text colour has to be
            composited over its actual backdrop before it means anything — and
            if that backdrop varies, so does the result.
          </li>
          <li>
            <strong>Placeholder text.</strong> Not exempt. If it conveys
            anything, it needs 4.5:1. This is why placeholders should not be
            carrying label text in the first place.
          </li>
          <li>
            <strong>Disabled controls.</strong> Exempt from 1.4.3 and 1.4.11,
            but users still need to perceive that the control exists and is
            unavailable. Exempt is not the same as invisible.
          </li>
          <li>
            <strong>Dark mode.</strong> A palette that passes in light mode
            tells you nothing about dark mode. Check both, and check every
            semantic colour, not just body text.
          </li>
        </ul>
      </Section>

      <Section id="checklist" title="Checklist">
        <Checklist
          items={[
            <>
              Body text clears <strong>4.5:1</strong>, large text clears{" "}
              <strong>3:1</strong>, in every theme.
            </>,
            <>
              Control borders, focus rings, and meaningful icons clear{" "}
              <strong>3:1</strong> against every surface they appear on.
            </>,
            <>
              Both a text colour and a background colour are specified — leaving
              one to the user agent is itself a failure.
            </>,
            <>
              Hover, focus, visited, and active states are checked, not just the
              default.
            </>,
            <>
              The page still makes sense in greyscale: no information carried by
              colour alone.
            </>,
            <>
              Links in body copy are underlined, or clear 3:1 against the
              surrounding text.
            </>,
          ]}
        />

        <Callout label="Check it from your editor" variant="tip">
          <p>
            The <Link href="/wcag/scanner">wcag-a11y-scanner</Link> MCP server
            exposes <code>check_color_contrast</code>, which takes a pairing
            plus a font size and returns the verdict for each applicable
            criterion — along with a replacement colour that keeps the same hue
            when it fails.
          </p>
        </Callout>
      </Section>
    </article>
  );
}
