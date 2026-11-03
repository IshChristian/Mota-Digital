type BackRouter = { back: () => void; canGoBack: () => boolean; replace: (href: any) => void };

/**
 * Back, or home when there is nothing to go back to — e.g. in a browser after a
 * refresh or when a page was opened from a link, where router.back() does nothing.
 * "/" sends signed-in users to their own home (see app/_layout.tsx).
 */
export function safeBack(router: BackRouter, fallback = "/") {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
