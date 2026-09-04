import type { Metadata } from "next";
import NextLink from "next/link";
import { Button, Input, Link, link } from "@retrojb/ui";
import { Callout, Intro, Section } from "../_components/prose";
import styles from "./demo.module.css";

export const metadata: Metadata = {
  title: "Components",
  description:
    "The Button, Link and Input primitives from @retrojb/ui, rendered in every variant, with the tokens they are built on.",
};

const TOKENS = [
  "--background",
  "--surface",
  "--surface-raised",
  "--foreground",
  "--foreground-muted",
  "--border",
  "--border-strong",
  "--accent",
  "--accent-hover",
  "--danger",
  "--success",
] as const;

export default function ComponentsPage(): React.ReactElement {
  return (
    <>
      <h1>Components</h1>

      <Intro>
        <code>@retrojb/ui</code> holds the primitives shared across these apps.
        Tailwind CSS for the styling engine, <code>tailwind-variants</code> for
        the variant API, and a token layer this site already defines — so the
        components pick up the palette below without being told about it.
      </Intro>

      <Section id="button" title="Button">
        <p>
          Four intents and three sizes. Heights are 32, 40 and 48 pixels; the
          two larger ones clear the 44 pixel AAA target size in 2.5.5.
        </p>

        <div className={styles.row}>
          <Button intent="primary">Primary</Button>
          <Button intent="secondary">Secondary</Button>
          <Button intent="ghost">Ghost</Button>
          <Button intent="danger">Delete</Button>
          <Button disabled>Disabled</Button>
        </div>

        <div className={styles.row}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>

        <Callout variant="tip" label="Tip">
          <code>type</code> defaults to <code>&quot;button&quot;</code> rather
          than the HTML default of <code>&quot;submit&quot;</code>, so dropping
          one inside a form does not submit it by accident.
        </Callout>
      </Section>

      <Section id="link" title="Link">
        <p>
          The <code>inline</code> intent is underlined and cannot be talked out
          of it: against this palette, a link distinguished from body text by
          colour alone does not reach the 3:1 that 1.4.1 would require.
        </p>

        <ul>
          <li>
            An <Link href="#link">inline link</Link> inside a sentence.
          </li>
          <li>
            <Link href="#link" intent="standalone">
              A standalone link
            </Link>{" "}
            for navigation, where nothing is ambiguous.
          </li>
          <li>
            <Link href="#link" intent="muted">
              A muted link
            </Link>{" "}
            for secondary actions.
          </li>
          <li>
            <Link href="https://www.w3.org/WAI/WCAG22/quickref/" external>
              An external link
            </Link>{" "}
            — screen readers hear &ldquo;opens in a new tab&rdquo; appended to
            the name.
          </li>
        </ul>

        <p>
          <code>Link</code> renders a plain <code>&lt;a&gt;</code>. For
          client-side routing, put the exported <code>link()</code> variant on
          the router&apos;s own component instead:{" "}
          <NextLink href="/" className={link()}>
            back to the introduction
          </NextLink>
          .
        </p>
      </Section>

      <Section id="input" title="Input">
        <p>
          <code>label</code> is a required prop. An unlabelled input is the most
          common accessibility failure there is, so it fails the type check
          instead of an audit. Passing <code>error</code> is the only way to get
          the invalid styling, which keeps what is shown and what is announced
          from drifting apart.
        </p>

        <div className={styles.stack}>
          <Input label="Full name" placeholder="Ada Lovelace" />

          <Input
            label="Email"
            type="email"
            required
            description="Used for sign-in. We never share it."
          />

          <Input
            label="Workspace slug"
            defaultValue="retro mcps"
            error="Use lowercase letters, numbers and hyphens only."
          />

          <Input label="Search" labelHidden placeholder="Search docs…" />

          <Input label="Plan" defaultValue="Enterprise" disabled />
        </div>

        <Callout label="How it is wired">
          The label, description and error are tied to the control with{" "}
          <code>htmlFor</code> and <code>aria-describedby</code> using{" "}
          <code>useId</code>, so the ids stay stable between the server and
          client render even with several fields on one page.
        </Callout>
      </Section>

      <Section id="tokens" title="Tokens">
        <p>
          The components read a set of plain custom properties, which{" "}
          <code>@theme</code> maps into Tailwind&apos;s colour namespace. This
          site declares these already in <code>globals.css</code>, and unlayered
          CSS beats the package&apos;s layered defaults, so its palette is the
          one in effect here — and <code>npm run check:contrast</code> stays the
          authority on it.
        </p>

        <ul className={styles.swatches}>
          {TOKENS.map((token) => (
            <li key={token} className={styles.swatch}>
              <span
                className={styles.chip}
                style={{ background: `var(${token})` }}
                aria-hidden="true"
              />
              <code>{token}</code>
            </li>
          ))}
        </ul>

        <p>
          Overriding one retints every component with no rebuild of the package,
          because the utilities resolve through to these variables at paint time
          rather than baking the colour in.
        </p>
      </Section>
    </>
  );
}
