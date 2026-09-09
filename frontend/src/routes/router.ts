type RouteParams = Record<string, string>;

type RouteHandler = (context: RouteContext) => Promise<void> | void;

type RouteGuard = (context: RouteContext) => Promise<boolean> | boolean;

type Middleware = (
  context: RouteContext,
  next: () => Promise<void>,
) => Promise<void>;

interface RouteContext {
  params: RouteParams;
  query: URLSearchParams;
  path: string;
  hash: string;
  route: MatchedRoute | null;
}

interface MatchedRoute {
  pattern: string;
  name?: string;
  params: RouteParams;
}

interface InternalRoute {
  pattern: string;
  regex: RegExp;
  keys: string[];
  handler?: RouteHandler;
  guards: RouteGuard[];
  name?: string;
  lazy?: () => Promise<{
    default: RouteHandler;
  }>;
}

class Router {
  private routes: InternalRoute[] = [];

  private middlewares: Middleware[] = [];

  private notFoundHandler: RouteHandler = () => {};

  private errorHandler: (error: Error) => void | Promise<void> = console.error;

  private navigationId = 0;

  private currentPath = "";

  private currentContext: RouteContext | null = null;

  private scrollPositions = new Map<
    string,
    {
      x: number;
      y: number;
    }
  >();

  constructor() {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }

  add(
    pattern: string,
    handler: RouteHandler,
    options?: {
      name?: string;
      guards?: RouteGuard[];
    },
  ): this {
    this.addRoute(pattern, handler, options);

    return this;
  }

  lazy(
    pattern: string,
    loader: () => Promise<{
      default: RouteHandler;
    }>,
    options?: {
      name?: string;
      guards?: RouteGuard[];
    },
  ): this {
    const route: InternalRoute = {
      pattern,
      regex: this.patternToRegex(pattern),
      keys: this.extractKeys(pattern),
      lazy: loader,
      guards: options?.guards ?? [],
      name: options?.name,
    };

    this.routes.push(route);

    return this;
  }

  use(...middlewares: Middleware[]): this {
    this.middlewares.push(...middlewares);

    return this;
  }

  guard(guard: RouteGuard): this {
    if (this.routes.length > 0) {
      const lastRoute = this.routes[this.routes.length - 1];

      lastRoute.guards.push(guard);
    }

    return this;
  }

  notFound(handler: RouteHandler): this {
    this.notFoundHandler = handler;

    return this;
  }

  onError(handler: (error: Error) => void | Promise<void>): this {
    this.errorHandler = handler;

    return this;
  }

  async navigate(
    path: string,
    options?: {
      replace?: boolean;
      state?: unknown;
    },
  ): Promise<void> {
    try {
      const url = new URL(path, window.location.origin);

      if (url.origin !== window.location.origin) {
        window.location.assign(url.href);
        return;
      }

      const nextPath = this.getUrlKey(url);

      const currentPath = this.getCurrentUrlKey();

      if (nextPath === currentPath) {
        await this.resolve(false);
        return;
      }

      this.saveCurrentScroll();

      if (options?.replace) {
        history.replaceState(options?.state ?? {}, "", nextPath);
      } else {
        history.pushState(options?.state ?? {}, "", nextPath);
      }

      await this.resolve(false);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async resolve(isPopState = false): Promise<void> {
    const navigationId = ++this.navigationId;

    try {
      const url = new URL(window.location.href);

      const path = url.pathname;

      const query = url.searchParams;

      const hash = url.hash;

      const urlKey = this.getUrlKey(url);

      let matchedRoute: MatchedRoute | null = null;

      let handler: RouteHandler | null = null;

      for (const route of this.routes) {
        const match = route.regex.exec(path);

        if (!match) {
          continue;
        }

        const params: RouteParams = {};

        route.keys.forEach((key, index) => {
          const value = match[index + 1];

          if (value !== undefined) {
            params[key] = decodeURIComponent(value);
          }
        });

        matchedRoute = {
          pattern: route.pattern,
          name: route.name,
          params,
        };

        const context: RouteContext = {
          params,
          query,
          path,
          hash,
          route: matchedRoute,
        };

        let guardsPassed = true;

        for (const guard of route.guards) {
          const result = await guard(context);

          if (navigationId !== this.navigationId) {
            return;
          }

          if (!result) {
            guardsPassed = false;
            break;
          }
        }

        if (!guardsPassed) {
          handler = null;
          continue;
        }

        if (route.lazy) {
          const module = await route.lazy();

          if (navigationId !== this.navigationId) {
            return;
          }

          handler = module.default;
        } else if (route.handler) {
          handler = route.handler;
        }

        break;
      }

      if (navigationId !== this.navigationId) {
        return;
      }

      const context: RouteContext = {
        params: matchedRoute?.params ?? {},
        query,
        path,
        hash,
        route: matchedRoute,
      };

      this.currentContext = context;

      const middlewareChain = async (): Promise<void> => {
        if (handler) {
          await handler(context);
        } else {
          await this.notFoundHandler(context);
        }
      };

      let index = 0;

      const executeMiddleware = async (): Promise<void> => {
        if (index < this.middlewares.length) {
          const middleware = this.middlewares[index++];

          await middleware(context, executeMiddleware);

          return;
        }

        await middlewareChain();
      };

      await executeMiddleware();

      if (navigationId !== this.navigationId) {
        return;
      }

      this.currentPath = urlKey;

      if (isPopState) {
        this.restoreScroll(urlKey);
      } else {
        this.scrollToTop();
      }

      this.dispatchPageChanged(path, matchedRoute);
    } catch (error) {
      if (navigationId !== this.navigationId) {
        return;
      }

      this.handleError(error as Error);
    }
  }

  private addRoute(
    pattern: string,
    handler: RouteHandler,
    options?: {
      name?: string;
      guards?: RouteGuard[];
    },
  ): void {
    const route: InternalRoute = {
      pattern,
      regex: this.patternToRegex(pattern),
      keys: this.extractKeys(pattern),
      handler,
      guards: options?.guards ?? [],
      name: options?.name,
    };

    this.routes.push(route);
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          return "([^/?#]+)";
        }

        if (segment.startsWith("*")) {
          return "(.*)";
        }

        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("\\/");

    return new RegExp(`^${escaped}$`);
  }

  private extractKeys(pattern: string): string[] {
    const keys: string[] = [];

    const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(pattern)) !== null) {
      keys.push(match[1]);
    }

    return keys;
  }

  private getUrlKey(url: URL): string {
    return url.pathname + url.search + url.hash;
  }

  private getCurrentUrlKey(): string {
    return (
      window.location.pathname + window.location.search + window.location.hash
    );
  }

  private saveCurrentScroll(): void {
    const key = this.getCurrentUrlKey();

    this.scrollPositions.set(key, {
      x: window.scrollX,
      y: window.scrollY,
    });
  }

  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }

  private restoreScroll(urlKey: string): void {
    const saved = this.scrollPositions.get(urlKey);

    if (!saved) {
      this.scrollToTop();
      return;
    }

    window.scrollTo({
      top: saved.y,
      left: saved.x,
      behavior: "instant",
    });
  }

  private dispatchPageChanged(path: string, route: MatchedRoute | null): void {
    window.dispatchEvent(
      new CustomEvent("page-changed", {
        detail: {
          path,
          route,
        },
      }),
    );
  }

  private handleError(error: Error): void {
    try {
      this.errorHandler(error);
    } catch (err) {
      console.error("Error in error handler:", err);
    }
  }

  start(): void {
    this.attachPopStateListener();
    this.attachClickListener();
    this.attachScrollListener();

    void this.resolve(false);
  }

  private attachPopStateListener(): void {
    window.addEventListener("popstate", () => {
      void this.resolve(true);
    });
  }

  private attachScrollListener(): void {
    window.addEventListener(
      "scroll",
      () => {
        if (!this.currentPath) {
          return;
        }

        this.scrollPositions.set(this.currentPath, {
          x: window.scrollX,
          y: window.scrollY,
        });
      },
      {
        passive: true,
      },
    );
  }

  private attachClickListener(): void {
    document.addEventListener(
      "click",
      (event) => {
        if (!(event instanceof MouseEvent)) {
          return;
        }

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        const target = event.target;

        if (!(target instanceof Element)) {
          return;
        }

        const link = target.closest<HTMLAnchorElement>("a[href]");

        if (!link) {
          return;
        }

        if (
          link.hasAttribute("download") ||
          link.hasAttribute("data-no-router") ||
          link.hasAttribute("data-external")
        ) {
          return;
        }

        if (link.target && link.target !== "_self") {
          return;
        }

        const href = link.getAttribute("href");

        if (!href) {
          return;
        }

        if (
          href.startsWith("#") ||
          href.startsWith("//") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:")
        ) {
          return;
        }

        let url: URL;

        try {
          url = new URL(href, window.location.origin);
        } catch {
          return;
        }

        if (url.origin !== window.location.origin) {
          return;
        }

        const nextPath = this.getUrlKey(url);

        const currentPath = this.getCurrentUrlKey();

        event.preventDefault();
        event.stopPropagation();

        if (nextPath === currentPath) {
          void this.resolve(false);
          return;
        }

        void this.navigate(nextPath);
      },
      true,
    );
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  getCurrentContext(): RouteContext | null {
    return this.currentContext;
  }

  isCurrentPath(path: string): boolean {
    return this.currentPath.startsWith(path);
  }
}

export const router = new Router();
