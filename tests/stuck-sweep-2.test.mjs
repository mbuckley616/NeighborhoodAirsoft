// v1.153: the stuck-kid sweep, part 2 of 4 (every fourth match; tests/lib/stuck-sweep.mjs says what and why)
import { sweep } from './lib/stuck-sweep.mjs';
await sweep(2);
