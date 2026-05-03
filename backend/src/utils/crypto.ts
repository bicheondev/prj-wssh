import crypto from 'crypto';

// Encryption model:
// - ENCRYPTION_KEY is a 32+ char server-side secret (never sent to browser).
// - We derive a 32-byte key with SHA-256, then use AES-256-GCM per secret.
// - Payload = base64(iv[12] + tag[16] + ciphertext[n]).
const algo = 'aes-256-gcm';
const kdf = (k: string) => crypto.createHash('sha256').update(k).digest();

export function encryptSecret(secret: string, master: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algo, kdf(master), iv);
  const ct = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}
export function decryptSecret(payload: string, master: string) {
  const raw = Buffer.from(payload, 'base64');
  const decipher = crypto.createDecipheriv(algo, kdf(master), raw.subarray(0,12));
  decipher.setAuthTag(raw.subarray(12,28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}
