// Native icon fonts are bundled — nothing to wait for.
export function ioniconsReady(): Promise<boolean> {
  return Promise.resolve(true);
}
