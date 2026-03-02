export {};

declare global {
  const chrome: any;

  interface Window {
    __ECDASH__?: Record<string, any>;
    __ECDASH_ITEMS__?: Array<Record<string, any>>;
    __ECDASH_COURSES__?: Array<Record<string, any>>;
  }
}
