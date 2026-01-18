import { DatabaseSync } from 'node:sqlite';

import type { SQLiteDatabase as ExpoSQLiteDatabase } from 'expo-sqlite';

type SupportedValueType = null | number | bigint | string | Uint8Array;

export class NodeSQLiteAdapter implements Partial<ExpoSQLiteDatabase> {
  private isClosed = false;

  constructor(private db: DatabaseSync) {}

  private filterParam(p: any): SupportedValueType {
    if (p === undefined) return null;
    if (p === null) return null;
    if (typeof p === 'number') return p;
    if (typeof p === 'string') return p;
    if (typeof p === 'bigint') return p;
    if (p instanceof Uint8Array) return p;
    if (Buffer.isBuffer(p)) return new Uint8Array(p);
    if (typeof p === 'boolean') return p ? 1 : 0;
    console.warn('Unexpected parameter type:', typeof p, p);
    return JSON.stringify(p);
  }

  private normalizeParams(params: any[]): SupportedValueType[] {
    // Handle case where params is [array] - expo-sqlite style
    if (params.length === 1 && Array.isArray(params[0])) {
      return params[0].map((p: any) => this.filterParam(p));
    }
    return params.map((p) => this.filterParam(p));
  }

  // Convert null-prototype objects to regular objects
  private normalizeResult(row: any): any {
    if (row === null || row === undefined) return row;
    return { ...row };
  }

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async getAllAsync(source: string, ...params: any[]): Promise<any[]> {
    const stmt = this.db.prepare(source);
    const filteredParams = this.normalizeParams(params);
    const results = stmt.all(...filteredParams) as any[];
    return results.map((row) => this.normalizeResult(row));
  }

  async getFirstAsync(source: string, ...params: any[]): Promise<any> {
    const stmt = this.db.prepare(source);
    const filteredParams = this.normalizeParams(params);
    const result = stmt.get(...filteredParams);
    return this.normalizeResult(result);
  }

  async runAsync(source: string, ...params: any[]): Promise<any> {
    const stmt = this.db.prepare(source);
    const filteredParams = this.normalizeParams(params);
    return stmt.run(...filteredParams);
  }

  async closeAsync(): Promise<void> {
    if (!this.isClosed) {
      this.db.close();
      this.isClosed = true;
    }
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
  const db = new DatabaseSync(name);
  return new NodeSQLiteAdapter(db);
}
