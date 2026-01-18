import { Buffer as BufferType } from 'buffer';

export {};

declare global {
  interface String {
    splice(start: number, replacement: string): string;
  }

  // eslint-disable-next-line no-var
  var Buffer: typeof BufferType;
}
