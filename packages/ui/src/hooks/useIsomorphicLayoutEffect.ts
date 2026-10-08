"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * `useLayoutEffect` has nothing to do during a server render — there is no layout
 * to read and no paint to beat — so React logs a warning when it is called there.
 * The components in this package carry `"use client"`, which marks them as client
 * modules but does not stop them being server-rendered for the initial HTML, so
 * the warning is reachable and this swap is what avoids it.
 *
 * `ComboBox` needs the layout timing for one thing only: restoring the caret
 * after inline completion rewrites the input's value. Doing that in `useEffect`
 * would let the browser paint once with the caret in the wrong place first.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export { useIsomorphicLayoutEffect };
