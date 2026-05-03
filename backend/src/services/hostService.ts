import { v4 as uuid } from 'uuid';
import { encryptSecret } from '../utils/crypto.js';

export function createHost(db: any, data: any, key: string) {
  const now = new Date().toISOString();
  const id = uuid();
  db.prepare(`INSERT INTO hosts VALUES (@id,@name,@host,@port,@username,@authMode,@encryptedSecret,@grp,@createdAt,@updatedAt)`)
    .run({ ...data, id, encryptedSecret: encryptSecret(data.secret, key), createdAt: now, updatedAt: now, grp: data.group ?? null });
  return id;
}

export const listHosts = (db: any) => db.prepare('SELECT id,name,host,port,username,authMode,grp as "group",createdAt,updatedAt FROM hosts').all();
export const getHost = (db: any, id: string) => db.prepare('SELECT * FROM hosts WHERE id=?').get(id);
