export {};

declare global {
  interface String {
    splice(start: number, replacement: string): string;
  }
}
