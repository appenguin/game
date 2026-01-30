// Type declarations for @strudel/web (no bundled types)
declare module "@strudel/web" {
  export function initStrudel(options?: {
    prebake?: () => unknown;
  }): Promise<unknown>;
}
