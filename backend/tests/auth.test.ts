import { describe,it,expect } from 'vitest';
import { hashPassword,verifyPassword } from '../src/services/auth.js';
describe('auth',()=>{it('hash verify', async()=>{const h=await hashPassword('Password123!'); expect(await verifyPassword('Password123!',h)).toBe(true);});});
