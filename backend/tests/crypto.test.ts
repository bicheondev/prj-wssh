import { describe,it,expect } from 'vitest';
import { encryptSecret,decryptSecret } from '../src/utils/crypto.js';
describe('crypto',()=>{it('round trips',()=>{const c=encryptSecret('abc','x'.repeat(32)); expect(decryptSecret(c,'x'.repeat(32))).toBe('abc');});});
