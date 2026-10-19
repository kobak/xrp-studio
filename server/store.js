import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function createStore(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, google_id TEXT UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('teacher','student')));
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS classrooms(id TEXT PRIMARY KEY,teacher_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,code TEXT NOT NULL UNIQUE,created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memberships(class_id TEXT REFERENCES classrooms(id) ON DELETE CASCADE,student_id TEXT REFERENCES users(id) ON DELETE CASCADE,nickname TEXT NOT NULL,PRIMARY KEY(class_id,student_id),UNIQUE(class_id,nickname));
    CREATE TABLE IF NOT EXISTS assignments(id TEXT PRIMARY KEY,class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,title TEXT NOT NULL,instructions TEXT NOT NULL,lesson TEXT,created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY,assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,student_id TEXT NOT NULL REFERENCES users(id),project TEXT NOT NULL,feedback TEXT NOT NULL DEFAULT '',created TEXT NOT NULL,UNIQUE(assignment_id,student_id));`);
  return db;
}
