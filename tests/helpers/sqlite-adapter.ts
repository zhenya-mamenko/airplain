import Database from 'better-sqlite3';

import type { SQLiteDatabase as ExpoSQLiteDatabase } from 'expo-sqlite';

export class BetterSQLite3Adapter implements Partial<ExpoSQLiteDatabase> {
  constructor(private db: Database.Database) {}

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async getAllAsync(source: string, ...params: any[]): Promise<any[]> {
    const stmt = this.db.prepare(source);
    const filteredParams = params.map((p) => (p === undefined ? null : p));
    return stmt.all(...filteredParams);
  }

  async getFirstAsync(source: string, ...params: any[]): Promise<any> {
    const stmt = this.db.prepare(source);
    const filteredParams = params.map((p) => (p === undefined ? null : p));
    return stmt.get(...filteredParams);
  }

  async runAsync(source: string, ...params: any[]): Promise<any> {
    const stmt = this.db.prepare(source);
    const actualParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const filteredParams = actualParams.map((p) => {
      if (p === undefined) return null;
      if (p === null) return null;
      if (typeof p === 'number') return p;
      if (typeof p === 'string') return p;
      if (typeof p === 'bigint') return p;
      if (Buffer.isBuffer(p)) return p;
      if (typeof p === 'boolean') return p ? 1 : 0;
      console.warn('Unexpected parameter type:', typeof p, p);
      return JSON.stringify(p);
    });
    return stmt.run(...filteredParams);
  }

  async closeAsync(): Promise<void> {
    this.db.close();
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (error) {
      throw error;
    }
  }
}

export async function openDatabaseAsync(name: string): Promise<any> {
  const db = new Database(name);
  return new BetterSQLite3Adapter(db);
}
