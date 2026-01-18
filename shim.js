// This file must be imported first to set up polyfills
// before any other modules that depend on them
import { Buffer } from 'buffer';

global.Buffer = Buffer;
