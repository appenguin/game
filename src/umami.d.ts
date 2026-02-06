// Umami analytics global
declare const umami: {
  track(event: string, data?: Record<string, string | number | boolean>): void;
} | undefined;
