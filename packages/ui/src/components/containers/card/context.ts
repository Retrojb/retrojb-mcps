"use client";
/*
 * The channel between a card and its parts.
 *
 * Only `size` crosses it. `CardTitle` and `CardBody` scale their type with the
 * card around them, and threading `size` through props would mean repeating it on
 * every part of every card.
 *
 * Unlike `Table`'s context this one falls back to a default instead of throwing.
 * A table part outside a table has lost its TanStack instance and cannot render
 * correctly; a card part outside a card has lost nothing but its size, and using
 * `CardHeader` inside markup styled with `cardStyles()` is a legitimate thing to
 * do.
 *
 * `"use client"` because `createContext` cannot run in a server component.
 */
import { createContext, useContext } from "react";
import type { ICardContextValue } from "./types";

const CardContext = createContext<ICardContextValue>({ size: "md" });

const useCardContext = (): ICardContextValue => useContext(CardContext);

export { CardContext, useCardContext };
