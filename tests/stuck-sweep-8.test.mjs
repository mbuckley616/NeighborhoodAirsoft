// v1.153: the stuck-kid sweep, part 8 of 16 since v1.166 (every sixteenth match; tests/lib/stuck-sweep.mjs says what and why)
import { sweep } from './lib/stuck-sweep.mjs';
await sweep(8);
