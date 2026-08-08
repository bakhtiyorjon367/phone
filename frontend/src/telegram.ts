// Minimal surface of the Telegram Mini App SDK (telegram-web-app.js, loaded
// as a global script in index.html) that this app relies on.
interface TelegramSafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        platform: string;
        safeAreaInset?: TelegramSafeAreaInset;
        contentSafeAreaInset?: TelegramSafeAreaInset;
        ready: () => void;
        expand: () => void;
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
      };
    };
  }
}

/** The raw, signed initData string the backend verifies. Null outside Telegram. */
export const getTelegramInitData = (): string | null =>
  window.Telegram?.WebApp?.initData || null;

/** Tells Telegram the app is loaded and expands it to full height. Safe to call outside Telegram (no-op). */
export const initTelegramWebApp = (): void => {
  window.Telegram?.WebApp?.ready();
  window.Telegram?.WebApp?.expand();
};

// Telegram's own chrome (the Close/Back button + title bar) floats on top of
// our page rather than reserving space for it on every client - notably
// Telegram Desktop reports a safe area of 0 there. contentSafeAreaInset
// (Bot API 8.0+) is the real value when a client supports it; MIN_TOP_INSET
// is a floor so older/unsupported clients still clear that top-left button.
const MIN_TOP_INSET = 56;

/**
 * Reads Telegram's safe area insets and republishes the top one as the
 * `--tg-safe-area-top` CSS variable, so layout can pad around Telegram's own
 * header/close button instead of rendering underneath it. Keeps it in sync
 * as Telegram reports changes (e.g. rotation, header state).
 */
export const watchTelegramSafeArea = (): void => {
  const webApp = window.Telegram?.WebApp;

  const apply = () => {
    const top = Math.max(
      webApp?.contentSafeAreaInset?.top ?? 0,
      webApp?.safeAreaInset?.top ?? 0,
      MIN_TOP_INSET,
    );
    document.documentElement.style.setProperty(
      "--tg-safe-area-top",
      `${top}px`,
    );
  };

  apply();
  if (!webApp) return;
  webApp.onEvent("viewportChanged", apply);
  webApp.onEvent("safeAreaChanged", apply);
  webApp.onEvent("contentSafeAreaChanged", apply);
};
