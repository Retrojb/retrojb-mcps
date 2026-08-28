"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-nav.module.css";

interface NavItem {
  readonly href: string;
  readonly label: string;
}

interface NavGroup {
  readonly title: string;
  readonly items: readonly NavItem[];
}

const NAV: readonly NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/", label: "Introduction" }],
  },
  {
    title: "WCAG 2 basics",
    items: [
      { href: "/wcag/color-contrast", label: "Colour and contrast" },
      { href: "/wcag/screen-readers", label: "Screen readers" },
      { href: "/wcag/keyboard-and-tabbing", label: "Keyboard and tabbing" },
    ],
  },
  {
    title: "Tooling",
    items: [{ href: "/wcag/scanner", label: "wcag-a11y-scanner MCP" }],
  },
];

/**
 * Primary site navigation.
 *
 * A client component only because it needs the current pathname to set
 * `aria-current="page"`, which is what tells a screen reader user where they
 * are in the list.
 */
export function SiteNav(): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav aria-labelledby="site-nav-heading" className={styles.nav}>
      <h2 id="site-nav-heading" className="visuallyHidden">
        Documentation sections
      </h2>

      {NAV.map((group) => (
        <div key={group.title} className={styles.group}>
          <p className={styles.groupTitle}>{group.title}</p>
          <ul className={styles.list}>
            {group.items.map((item) => {
              const isCurrent = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${styles.link} ${isCurrent ? styles.current : ""}`}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
