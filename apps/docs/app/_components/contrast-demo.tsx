import { checkContrast, type ContentType } from "@retrojb/wcag-a11y-scanner";
import { proseStyles as styles } from "./prose";

export interface ContrastExample {
  readonly foreground: string;
  readonly background: string;
  readonly label: string;
  readonly contentType?: ContentType;
  readonly fontSizePx?: number;
  readonly bold?: boolean;
}

/**
 * Renders worked contrast examples.
 *
 * Every ratio and verdict in this table is computed at build time by the same
 * engine the `wcag-a11y-scanner` MCP server uses, so the documentation cannot
 * quietly disagree with the tool.
 *
 * A note on the swatches: a page documenting contrast has to be able to show
 * insufficient contrast, so some samples here deliberately fail 1.4.3. They are
 * marked `aria-hidden` and carry no information of their own — the pairing name,
 * the hex values, the ratio, and the verdict are all separate text at full
 * contrast. Nothing is lost by not perceiving a swatch.
 *
 * Running `audit_html` over this page will still flag them, correctly: the rule
 * cannot see that the text is duplicated elsewhere. That is a good illustration
 * of why findings need a human read.
 */
export function ContrastDemo({
  caption,
  examples,
}: {
  caption: string;
  examples: readonly ContrastExample[];
}): React.ReactElement {
  const rows = examples.map((example) => {
    const result = checkContrast({
      foreground: example.foreground,
      background: example.background,
      contentType: example.contentType ?? "text",
      targetLevel: "AA",
      text: {
        fontSizePx: example.fontSizePx,
        bold: example.bold,
      },
    });

    const aa = result.results.find((entry) => entry.level === "AA");
    const aaa = result.results.find((entry) => entry.level === "AAA");

    return { example, result, aa, aaa };
  });

  return (
    <div className={styles.tableWrap}>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Pairing</th>
            <th scope="col">
              Sample
              <span className="visuallyHidden">
                {" "}
                — visual only; the verdict is in the columns that follow
              </span>
            </th>
            <th scope="col">Colours</th>
            <th scope="col">Ratio</th>
            <th scope="col">AA</th>
            <th scope="col">AAA</th>
            <th scope="col">What it means</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ example, result, aa, aaa }) => (
            <tr
              key={`${example.foreground}-${example.background}-${example.label}`}
            >
              <th scope="row">{example.label}</th>
              <td>
                {/*
                 * Decorative: a rendering of the pairing this row describes.
                 * Hidden from assistive technology because every fact about it
                 * is already stated as text in the same row, which is what makes
                 * a deliberately-failing sample acceptable here.
                 */}
                <span
                  aria-hidden="true"
                  className={styles.swatch}
                  style={{
                    color: result.foreground.hex,
                    background: result.background.hex,
                    fontSize: example.fontSizePx
                      ? `${example.fontSizePx}px`
                      : undefined,
                    fontWeight: example.bold ? 700 : undefined,
                  }}
                >
                  Aa
                </span>
              </td>
              <td>
                <code>{result.foreground.hex}</code> on{" "}
                <code>{result.background.hex}</code>
              </td>
              <td>{result.ratio}:1</td>
              <td>
                {aa ? (
                  <span
                    className={
                      aa.passes ? styles.verdictPass : styles.verdictFail
                    }
                  >
                    {aa.requiredRatio}:1 needed
                  </span>
                ) : (
                  "n/a"
                )}
              </td>
              <td>
                {aaa ? (
                  <span
                    className={
                      aaa.passes ? styles.verdictPass : styles.verdictFail
                    }
                  >
                    {aaa.requiredRatio}:1 needed
                  </span>
                ) : (
                  "Not defined"
                )}
              </td>
              <td>{describe(example, result.ratio, aa?.passes ?? false)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function describe(
  example: ContrastExample,
  ratio: number,
  passesAA: boolean,
): string {
  const kind = example.contentType ?? "text";

  if (kind !== "text") {
    return passesAA
      ? "Clears the 3:1 floor for a control boundary or a meaningful graphic."
      : "Too faint to serve as a control boundary or focus indicator.";
  }

  const size =
    example.fontSizePx === undefined
      ? "normal-size text"
      : `${example.fontSizePx}px${example.bold ? " bold" : ""} text`;

  if (passesAA) {
    return `Usable for ${size} at AA. ${ratio >= 7 ? "Also clears AAA." : "Below the AAA bar."}`;
  }

  return `Not usable for ${size}. Increase the lightness difference or enlarge the text.`;
}
