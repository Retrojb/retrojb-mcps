import { parse } from "yaml";

/**
 * The parts of a `<Name>Spec.yaml` the docs pages read.
 *
 * The full contract is `packages/ui/componentSpec.schema.json`, which CI checks
 * every spec against. This is a reading type, not a second schema: every field
 * is optional except the ones a docs page cannot render without, so a spec that
 * adds a field never breaks a page.
 */
interface IComponentSpec {
  readonly name: string;
  readonly category: string;
  readonly subcategory?: string;
  readonly status: string;
  readonly complexity: string;
  readonly description: string;
  readonly files: Readonly<Record<string, string | null>>;
  readonly exports?: ReadonlyArray<{
    readonly name: string;
    readonly kind: string;
    readonly internal?: boolean;
    readonly note?: string;
  }>;
  readonly accessibility?: {
    readonly element?: string;
    readonly role?: string;
    readonly pattern?: string;
    readonly keyboard?: readonly string[];
    readonly wcag?: readonly string[];
    readonly notes?: readonly string[];
  };
  readonly usage?: {
    readonly standalone?: boolean;
    readonly alternatives?: ReadonlyArray<{
      readonly id: string;
      readonly when: string;
    }>;
    readonly guidance?: {
      readonly do?: readonly string[];
      readonly dont?: readonly string[];
    };
  };
  readonly versioning?: { readonly introducedIn?: string };
}

/**
 * Parses a spec imported with Vite's `?raw` suffix.
 *
 * ```mdx
 * import specSource from "…/ButtonSpec.yaml?raw";
 * export const spec = parseSpec(specSource);
 * ```
 *
 * Throws, naming the problem, when the file is not a spec. A docs page that
 * fails to build is better than one that quietly renders nothing.
 */
const parseSpec = (source: string): IComponentSpec => {
  const data: unknown = parse(source);
  if (
    typeof data !== "object" ||
    data === null ||
    !("name" in data) ||
    !("status" in data)
  ) {
    throw new Error(
      "parseSpec: the YAML is not a component spec (no name or status).",
    );
  }
  return data as IComponentSpec;
};

export { parseSpec };
export type { IComponentSpec };
