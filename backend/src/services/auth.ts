import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
export const signToken = (secret: string, sub: string) => jwt.sign({ sub }, secret, { expiresIn: '8h' });
export const verifyToken = (secret: string, token: string) => jwt.verify(token, secret) as { sub: string; exp: number };
