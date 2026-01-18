import { Buffer as BufferType } from 'buffer';

export {};

declare global {
  interface String {
    splice(start: number, replacement: string): string;
  }

  var Buffer: typeof BufferType;
}
