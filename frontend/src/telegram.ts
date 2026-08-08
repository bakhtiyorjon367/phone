// Minimal surface of the Telegram Mini App SDK (telegram-web-app.js, loaded
// as a global script in index.html) that this app relies on.
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
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
