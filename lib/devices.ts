/**
 * Which device frames a project can fill, from its own uploads. Pure, so
 * node:test runs it. A frame is drawn only for a device the project has at
 * least one real image for: a screen never borrows another device's shot.
 */

/** The fixed order frames are listed in, and the order of `data-devices`. */
export const DEVICE_ORDER = ['laptop', 'mobile', 'tablet'] as const;

export type RigDevice = (typeof DEVICE_ORDER)[number];

interface ImageLike {
  src?: string | null;
  device?: string | null;
}

/** An image counts only when its URL is something other than blank. */
export function hasUrl(image: ImageLike): boolean {
  return typeof image.src === 'string' && image.src.trim() !== '';
}

/** A device's own usable shots, in their order. */
export function shotsFor<T extends ImageLike>(images: readonly T[] | null | undefined, device: string): T[] {
  return (images ?? []).filter((img) => img.device === device && hasUrl(img));
}

/** The devices this project has images for, in DEVICE_ORDER. Empty when it has none. */
export function devicesFor(project: { images?: readonly ImageLike[] | null }): RigDevice[] {
  return DEVICE_ORDER.filter((device) => shotsFor(project.images, device).length > 0);
}

/** `data-devices` for the rig: the devices, space-joined. `""` means the empty plate. */
export function devicesAttr(devices: readonly RigDevice[]): string {
  return devices.join(' ');
}

/* ---------- slideshow: a frame with two or more shots --------------------- */

/** How long a shot holds before the next, when autoplay is running. */
export const SLIDE_MS = 4000;

/** The slide `step` away from `index`, wrapping both ways. 0 when there is nothing to cycle. */
export function nextSlide(index: number, count: number, step: number): number {
  if (count <= 1) return 0;
  return (((index + step) % count) + count) % count;
}

/** Only a frame with more than one shot is a slideshow: one shot gets no controls. */
export function isSlideshow(count: number): boolean {
  return count > 1;
}

/** A shot's alt text, ending "n of N" when it is one of several. */
export function slideAlt(alt: string, index: number, count: number): string {
  return count > 1 ? `${alt}, ${index + 1} of ${count}` : alt;
}

/** Autoplay runs only when nothing is holding it: no hover or focus, tab visible, on screen, motion allowed. */
export function shouldAutoplay(state: {
  count: number;
  held: boolean;
  hidden: boolean;
  inView: boolean;
  reduced: boolean;
}): boolean {
  return isSlideshow(state.count) && !state.held && !state.hidden && state.inView && !state.reduced;
}
