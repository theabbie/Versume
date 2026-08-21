import { ResumeDoc, ResumeMeta } from "../types";

export interface StorageProvider {
  readonly kind: "local" | "remote";
  listResumes(): Promise<ResumeMeta[]>;
  loadResume(id: string): Promise<ResumeDoc | null>;
  saveResume(doc: ResumeDoc): Promise<void>;
  deleteResume(id: string): Promise<void>;
}

const INDEX_KEY = "versume:index:v1";
const DOC_PREFIX = "versume:doc:";

function metaOf(doc: ResumeDoc): ResumeMeta {
  return {
    id: doc.id,
    name: doc.name,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    branches: Object.keys(doc.branches).length,
    versions: Object.keys(doc.versions).length,
  };
}

export class LocalProvider implements StorageProvider {
  readonly kind = "local" as const;

  private async store() {
    const { get, set, del } = await import("idb-keyval");
    return { get, set, del };
  }

  async listResumes(): Promise<ResumeMeta[]> {
    const { get } = await this.store();
    const idx = (await get<ResumeMeta[]>(INDEX_KEY)) ?? [];
    return idx.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async loadResume(id: string): Promise<ResumeDoc | null> {
    const { get } = await this.store();
    return (await get<ResumeDoc>(DOC_PREFIX + id)) ?? null;
  }

  async saveResume(doc: ResumeDoc): Promise<void> {
    const { get, set } = await this.store();
    doc.updatedAt = Date.now();
    await set(DOC_PREFIX + doc.id, doc);
    const idx = (await get<ResumeMeta[]>(INDEX_KEY)) ?? [];
    const meta = metaOf(doc);
    const i = idx.findIndex((m) => m.id === doc.id);
    if (i >= 0) idx[i] = meta;
    else idx.push(meta);
    await set(INDEX_KEY, idx);
  }

  async deleteResume(id: string): Promise<void> {
    const { get, set, del } = await this.store();
    await del(DOC_PREFIX + id);
    const idx = (await get<ResumeMeta[]>(INDEX_KEY)) ?? [];
    await set(INDEX_KEY, idx.filter((m) => m.id !== id));
  }
}

export function getStorageProvider(): StorageProvider {
  return new LocalProvider();
}
