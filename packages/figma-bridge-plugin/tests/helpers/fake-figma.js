/**
 * A minimal stand-in for the Figma plugin API.
 *
 * Covers only what the sandbox modules touch. Its value is in the parts that are
 * easy to get wrong and impossible to check by reading: that overlays land on the
 * page in absolute coordinates, that they are cleaned up, and that nodes on other
 * pages are detected rather than silently missed.
 */

let idCounter = 0;

function nextId() {
  idCounter += 1;
  return `${idCounter}:${idCounter}`;
}

/** Creates a scene node attached to `parent`. */
export function makeNode(options = {}) {
  const node = {
    id: options.id ?? nextId(),
    name: options.name ?? "Node",
    type: options.type ?? "FRAME",
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 100,
    height: options.height ?? 50,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    removed: false,
    parent: options.parent ?? null,
    fills: [],
    strokes: [],
    strokeWeight: 1,
    strokeAlign: "INSIDE",
    cornerRadius: 0,
    dashPattern: [],

    get absoluteBoundingBox() {
      if (options.absoluteBoundingBox === null) return null;
      return (
        options.absoluteBoundingBox ?? {
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        }
      );
    },

    resize(width, height) {
      node.width = width;
      node.height = height;
    },

    remove() {
      node.removed = true;
      if (node.parent !== null) {
        const index = node.parent.children.indexOf(node);
        if (index !== -1) node.parent.children.splice(index, 1);
      }
    },

    async getMainComponentAsync() {
      return options.mainComponent ?? null;
    },
  };

  if (options.children !== undefined) node.children = options.children;
  if (options.parent !== undefined && options.parent !== null) {
    options.parent.children.push(node);
  }

  return node;
}

/** Creates a page node. */
export function makePage(name) {
  /** Per-page listeners, since `nodechange` is bound to a PageNode. */
  const pageListeners = new Map();

  const page = {
    id: nextId(),
    name,
    type: "PAGE",
    parent: null,
    children: [],
    selection: [],

    appendChild(child) {
      if (child.parent !== null && Array.isArray(child.parent.children)) {
        const index = child.parent.children.indexOf(child);
        if (index !== -1) child.parent.children.splice(index, 1);
      }
      child.parent = page;
      page.children.push(child);
    },

    on(event, handler) {
      const bucket = pageListeners.get(event) ?? [];
      bucket.push(handler);
      pageListeners.set(event, bucket);
    },

    off(event, handler) {
      const bucket = pageListeners.get(event) ?? [];
      const index = bucket.indexOf(handler);
      if (index !== -1) bucket.splice(index, 1);
    },

    /** Test hook: how many handlers are attached for an event. */
    listenerCount(event) {
      return (pageListeners.get(event) ?? []).length;
    },

    /** Test hook: fire a page-level event. */
    emit(event, payload) {
      for (const handler of [...(pageListeners.get(event) ?? [])]) {
        handler(payload);
      }
    },
  };

  return page;
}

/**
 * Installs a fake `figma` global and returns handles for assertions.
 *
 * Returns a `restore` function; call it in test teardown so suites cannot leak
 * state into each other.
 */
export function installFakeFigma(options = {}) {
  const pages = options.pages ?? [makePage("Page 1")];
  const current = pages[0];

  const created = [];
  const scrolled = [];
  const listeners = new Map();

  /**
   * Extra nodes not reachable from a page, e.g. freshly created rectangles.
   *
   * Lookup walks the live page tree first. A snapshot registry would go stale the
   * moment a test created a node, which is exactly what tests do.
   */
  const detached = new Map();

  const findInTree = (node, id) => {
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
      const hit = findInTree(child, id);
      if (hit !== null) return hit;
    }
    return null;
  };

  const register = (node) => {
    detached.set(node.id, node);
  };

  /**
   * Whether `figma.loadAllPagesAsync()` has completed.
   *
   * Gates the same APIs Figma gates under `documentAccess: "dynamic-page"`, so a
   * plugin that forgets the load fails here instead of only in Figma.
   */
  let allPagesLoaded = false;
  let loadAllPagesCalls = 0;

  const document_ = {
    id: "0:0",
    name: options.fileName ?? "Fake File",
    type: "DOCUMENT",
    parent: null,
    children: pages,

    findAllWithCriteria(criteria) {
      if (!allPagesLoaded) {
        throw new Error(
          "Cannot call findAllWithCriteria in incremental mode without calling figma.loadAllPagesAsync first.",
        );
      }
      const types = criteria?.types ?? null;
      const out = [];
      const walk = (node) => {
        for (const child of node.children ?? []) {
          if (types === null || types.includes(child.type)) out.push(child);
          walk(child);
        }
      };
      for (const page of pages) walk(page);
      return out;
    },
  };
  for (const page of pages) page.parent = document_;

  const figma = {
    fileKey: options.fileKey === undefined ? "fake-key" : options.fileKey,
    editorType: options.editorType ?? "figma",
    root: document_,
    currentPage: current,

    async getNodeByIdAsync(id) {
      for (const page of pages) {
        const hit = findInTree(page, id);
        if (hit !== null) return hit;
      }
      return detached.get(id) ?? null;
    },

    createRectangle() {
      const rect = makeNode({ type: "RECTANGLE", name: "Rectangle" });
      created.push(rect);
      detached.set(rect.id, rect);
      return rect;
    },

    viewport: {
      scrollAndZoomIntoView(nodes) {
        scrolled.push(nodes.map((node) => node.id));
      },
    },

    clientStorage: {
      store: new Map(),
      async getAsync(key) {
        return figma.clientStorage.store.get(key);
      },
      async setAsync(key, value) {
        figma.clientStorage.store.set(key, value);
      },
    },

    variables: {
      async getLocalVariablesAsync() {
        return options.variables ?? [];
      },
      async getLocalVariableCollectionsAsync() {
        return options.variableCollections ?? [];
      },
    },

    ui: {
      messages: [],
      postMessage(message) {
        figma.ui.messages.push(message);
      },
      resize() {},
      onmessage: null,
    },

    /**
     * Enforces the dynamic-page rule for `documentchange`.
     *
     * This is the exact failure the plugin shipped with: registering the handler
     * at module top level, before any chance to await the load.
     */
    on(event, handler) {
      if (event === "documentchange" && !allPagesLoaded) {
        throw new Error(
          "in on: Cannot register documentchange handler in incremental mode without calling figma.loadAllPagesAsync first.",
        );
      }
      const bucket = listeners.get(event) ?? [];
      bucket.push(handler);
      listeners.set(event, bucket);
    },

    off(event, handler) {
      const bucket = listeners.get(event) ?? [];
      const index = bucket.indexOf(handler);
      if (index !== -1) bucket.splice(index, 1);
    },

    async loadAllPagesAsync() {
      loadAllPagesCalls += 1;
      if (options.failLoadAllPages === true) {
        throw new Error("Document too large to load");
      }
      allPagesLoaded = true;
    },

    showUI() {},
    closePlugin() {},
    notify() {},
  };

  const previous = globalThis.figma;
  globalThis.figma = figma;

  return {
    figma,
    pages,
    /** Overlay rectangles created via `createRectangle`. */
    created,
    /** Node id groups passed to `scrollAndZoomIntoView`. */
    scrolled,
    /** Registers an extra node so `getNodeByIdAsync` can find it. */
    register,
    /** Fires every handler registered for a `figma.on` event. */
    emit(event, payload) {
      for (const handler of [...(listeners.get(event) ?? [])]) {
        handler(payload);
      }
    },
    /** How many handlers are attached to a `figma.on` event. */
    listenerCount(event) {
      return (listeners.get(event) ?? []).length;
    },
    get allPagesLoaded() {
      return allPagesLoaded;
    },
    get loadAllPagesCalls() {
      return loadAllPagesCalls;
    },
    /** Switches the current page, as `figma.setCurrentPageAsync` would. */
    setCurrentPage(page) {
      figma.currentPage = page;
    },
    restore() {
      globalThis.figma = previous;
    },
  };
}
