import Database from 'better-sqlite3';
import fs from 'fs';

export type DB = Database.Database;

export function initDb(path: string): DB {
  fs.mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(`
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_settings (user_id TEXT PRIMARY KEY,theme TEXT NOT NULL DEFAULT 'dark',font_size INTEGER NOT NULL DEFAULT 14,font_family TEXT NOT NULL DEFAULT 'JetBrains Mono');
CREATE TABLE IF NOT EXISTS identities (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,type TEXT NOT NULL,encrypted_secret TEXT NOT NULL,encrypted_passphrase TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hosts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,display_name TEXT NOT NULL,hostname TEXT NOT NULL,port INTEGER NOT NULL,ssh_username TEXT NOT NULL,group_name TEXT,favorite INTEGER NOT NULL DEFAULT 0,notes TEXT,last_connected_at TEXT,identity_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS trusted_host_keys (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,host_id TEXT NOT NULL,fingerprint TEXT NOT NULL,algorithm TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(user_id,host_id));
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,host_id TEXT NOT NULL,status TEXT NOT NULL,started_at TEXT NOT NULL,ended_at TEXT);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY,user_id TEXT,event_type TEXT NOT NULL,target_id TEXT,metadata TEXT,created_at TEXT NOT NULL);
`);
  return db;
}
