import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./shell.module.css";
import { SiteNav } from "./site-nav";

/**
 * Page shell: skip link, landmarks, sidebar navigation.
 *
 * The structure here is the WCAG guidance in this site applied to itself —
 * one `main` with an id the skip link targets, `header`/`nav`/`footer`
 * landmarks, and the skip link as the first element in the tab order.
 */
export function Shell({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      <div className={styles.shell}>
        <header className={styles.masthead}>
          <div className={styles.mastheadInner}>
            <Link href="/" className={styles.wordmark}>
              retro-mcps docs
            </Link>
            <span className={styles.tagline}>
              WCAG 2 basics and AI tooling for accessibility
            </span>
          </div>
        </header>

        <div className={styles.body}>
          <div className={styles.sidebar}>
            <SiteNav />
          </div>

          <main id="main-content" className={styles.main}>
            {children}
          </main>
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <p>
              Summaries on this site are paraphrased for clarity. The normative
              text is{" "}
              <a href="https://www.w3.org/TR/WCAG22/">
                WCAG 2.2 (W3C Recommendation)
              </a>
              , and it wins in any disagreement.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
