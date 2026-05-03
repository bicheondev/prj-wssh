import Database from 'better-sqlite3';
import fs from 'fs';

export function initDb(path: string) {
  fs.mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true });
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS hosts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT NOT NULL,
      authMode TEXT NOT NULL,
      encryptedSecret TEXT NOT NULL,
      grp TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      hostId TEXT,
      status TEXT NOT NULL,
      ts TEXT NOT NULL
    );
  `);
  return db;
}
