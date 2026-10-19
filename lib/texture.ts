/**
 * The faceted ground's on/off switch, in one place. The Accent menu, the
 * first-visit tour and the lag notice all flip it, so the state lives on
 * `<html data-texture>` (set pre-paint by the layout's head script) and every
 * change is announced on `window`, which is how AccentPicker's switch stays in
 * step when something else turns the texture off.
 */

export const TEXTURE_EVENT = 'texture-change';
const KEY = 'texture';

export function isTextureOn(): boolean {
  return document.documentElement.dataset.texture !== 'off';
}

export function setTexture(on: boolean): void {
  const root = document.documentElement;
  if (on) delete root.dataset.texture;
  else root.dataset.texture = 'off';

  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    // Blocked storage: the switch still works, it just will not persist.
  }

  window.dispatchEvent(new CustomEvent<boolean>(TEXTURE_EVENT, { detail: on }));
}

/** Calls back with the new state on every change; returns the unsubscribe. */
export function onTextureChange(callback: (on: boolean) => void): () => void {
  const handler = (event: Event) => callback((event as CustomEvent<boolean>).detail);
  window.addEventListener(TEXTURE_EVENT, handler);
  return () => window.removeEventListener(TEXTURE_EVENT, handler);
}
