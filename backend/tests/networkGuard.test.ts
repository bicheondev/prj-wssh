import { describe,it,expect } from 'vitest';
import { validateTarget } from '../src/utils/networkGuard.js';
describe('network guard',()=>{it('blocks localhost', async()=>{await expect(validateTarget('localhost',22,false)).rejects.toThrow();});});
