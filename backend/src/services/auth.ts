import jwt from 'jsonwebtoken';

export const issueToken = (secret: string, sub: string) => jwt.sign({ sub }, secret, { expiresIn: '8h' });
export const verifyToken = (secret: string, token: string) => jwt.verify(token, secret) as { sub: string };
