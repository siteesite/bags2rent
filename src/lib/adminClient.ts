import { supabase } from "./supabase";

type MatchEntry = { column: string; op: "eq" | "in"; value: any };

interface DbQuery {
  table: string;
  operation: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  data?: any;
  match?: MatchEntry[];
  order?: { column: string; ascending: boolean };
  limit?: number;
  single?: boolean;
}

async function call<T = any>(payload: Record<string, any>): Promise<{ data: T | null; error: any }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ success: boolean; data: T | null; error: any }>(
      "admin-proxy",
      { body: payload }
    );
    if (error) {
      // tenta extrair a mensagem de erro do corpo da resposta
      let bodyMsg: string | undefined;
      try {
        // @ts-ignore
        if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          bodyMsg = body?.error || body?.message;
        }
      } catch {
        // ignore
      }
      return { data: null, error: bodyMsg ? new Error(bodyMsg) : error };
    }
    // Resposta 2xx: o body pode trazer {success:false, error:'...'}
    const bodyError = (data as any)?.error;
    const bodySuccess = (data as any)?.success;
    if (bodyError) return { data: null, error: new Error(bodyError) };
    if (bodySuccess === false) return { data: null, error: new Error('Operação falhou') };
    return { data: (data as any)?.data ?? null, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

function buildMatch(args: any[]): MatchEntry[] {
  const match: MatchEntry[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg === "function") {
      const fnBody = arg.toString();
      const eqMatch = fnBody.match(/\.eq\(['"]([\w_]+)['"]\s*,\s*([^)]+)\)/);
      const inMatch = fnBody.match(/\.in\(['"]([\w_]+)['"]\s*,\s*\[([^\]]+)\]\)/);
      if (eqMatch) {
        const col = eqMatch[1];
        const raw = eqMatch[2].trim();
        const val = raw.startsWith('"') ? raw.slice(1, -1) : Number(raw);
        match.push({ column: col, op: "eq", value: val });
      } else if (inMatch) {
        const col = inMatch[1];
        const raw = inMatch[2];
        const arr = raw.split(",").map((s: string) => {
          const t = s.trim();
          return t.startsWith('"') ? t.slice(1, -1) : Number(t);
        });
        match.push({ column: col, op: "in", value: arr });
      }
    }
  }
  return match;
}

class AdminQuery {
  private query: DbQuery;

  constructor(table: string, operation: DbQuery["operation"], columns?: string) {
    this.query = { table, operation, columns };
  }

  eq(column: string, value: any) {
    this.query.match = [...(this.query.match ?? []), { column, op: "eq", value }];
    return this;
  }

  in(column: string, values: any[]) {
    this.query.match = [...(this.query.match ?? []), { column, op: "in", value: values }];
    return this;
  }

  order(column: string, opts: { ascending?: boolean } = {}) {
    this.query.order = { column, ascending: opts.ascending ?? true };
    return this;
  }

  limit(n: number) {
    this.query.limit = n;
    return this;
  }

  single() {
    this.query.single = true;
    return this;
  }

  async then(resolve: (v: { data: any; error: any }) => any) {
    const result = await call({ action: "db", ...this.query });
    return resolve(result);
  }
}

class AdminInsert {
  private rows: any;
  constructor(private table: string, rows: any) {
    this.rows = rows;
  }
  async select() {
    return call({ action: "db", table: this.table, operation: "insert", data: this.rows });
  }
  then(resolve: (v: { data: any; error: any }) => any) {
    return this.select().then(resolve);
  }
}

class AdminUpdate {
  private match: MatchEntry[] = [];
  constructor(private table: string, private data: any) {}
  eq(column: string, value: any) {
    this.match.push({ column, op: "eq", value });
    return this;
  }
  in(column: string, values: any[]) {
    this.match.push({ column, op: "in", value: values });
    return this;
  }
  async select() {
    return call({ action: "db", table: this.table, operation: "update", data: this.data, match: this.match });
  }
  then(resolve: (v: { data: any; error: any }) => any) {
    return this.select().then(resolve);
  }
}

class AdminUpsert {
  constructor(private table: string, private rows: any) {}
  then(resolve: (v: { data: any; error: any }) => any) {
    return call({ action: "db", table: this.table, operation: "upsert", data: this.rows }).then(resolve);
  }
}

class AdminDelete {
  private match: MatchEntry[] = [];
  constructor(private table: string) {}
  eq(column: string, value: any) {
    this.match.push({ column, op: "eq", value });
    return this;
  }
  in(column: string, values: any[]) {
    this.match.push({ column, op: "in", value: values });
    return this;
  }
  then(resolve: (v: { data: any; error: any }) => any) {
    return call({ action: "db", table: this.table, operation: "delete", match: this.match }).then(resolve);
  }
}

class AdminFrom {
  constructor(private table: string) {}
  select(columns = "*") {
    return new AdminQuery(this.table, "select", columns);
  }
  insert(rows: any) {
    return new AdminInsert(this.table, rows);
  }
  update(data: any) {
    return new AdminUpdate(this.table, data);
  }
  upsert(rows: any) {
    return new AdminUpsert(this.table, rows);
  }
  delete() {
    return new AdminDelete(this.table);
  }
}

class AdminStorageBucket {
  constructor(private bucket: string) {}
  async createSignedUploadURL(path: string) {
    return call<{ signedUrl: string; token: string; path: string }>({
      action: "storage-signed-upload",
      bucket: this.bucket,
      path,
    });
  }
  async remove(paths: string[]) {
    return call({ action: "storage-remove", bucket: this.bucket, paths });
  }
  async upload(path: string, file: File | Blob) {
    // Envia o arquivo como base64 no corpo da requisição para o proxy
    // salvar via service_role (bypassa RLS de storage).
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    return call<{ path: string }>({
      action: "storage-upload",
      bucket: this.bucket,
      path,
      fileBase64: base64,
      contentType: (file as any).type || 'application/octet-stream',
    });
  }
  getPublicUrl(path: string) {
    const baseUrl = (supabase as any).storage?.url ?? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1`;
    return { data: { publicUrl: `${baseUrl}/object/public/${this.bucket}/${path}` } };
  }
}

class AdminStorage {
  from(bucket: string) {
    return new AdminStorageBucket(bucket);
  }
}

export const adminDb = {
  from: (table: string) => new AdminFrom(table),
};

export const adminStorage = new AdminStorage();

export async function adminSelect<T = any>(
  table: string,
  columns = "*",
  match: MatchEntry[] = []
): Promise<{ data: T[] | null; error: any }> {
  const res = await call<T[]>({ action: "db", table, operation: "select", columns, match });
  return res as any;
}
