"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "@/lib/store";
import { Button, Input, Logo, Modal, Badge } from "@/components/ui";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export default function Dashboard() {
  const router = useRouter();
  const { ready, init, resumes, createResume, deleteResume, importResume } = useStudio();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    init();
  }, [init]);

  async function handleCreate() {
    const id = await createResume(name.trim() || "Untitled Resume");
    setCreating(false);
    setName("");
    router.push("/studio/?id=" + id);
  }

  async function handleImport(file: File) {
    const text = await file.text();
    try {
      const id = await importResume(text);
      router.push("/studio/?id=" + id);
    } catch {
      alert("That file is not a valid Versume export.");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="text-sm font-semibold tracking-tight">Versume</div>
            <div className="text-xs text-zinc-500">Version control for resumes</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            New resume
          </Button>
        </div>
      </header>

      <main className="flex-1 pb-16">
        <div className="mb-8 mt-6">
          <h1 className="text-3xl font-semibold tracking-tight">Your resumes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every change is a version. Branch for each role, compose on the node canvas, compile to LaTeX-quality PDF.
          </p>
        </div>

        {!ready ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-600">Loading…</div>
        ) : resumes.length === 0 ? (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-edge2 py-20 text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-sm">Create your first resume</span>
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r) => (
              <div
                key={r.id}
                className="group relative cursor-pointer rounded-xl border border-edge bg-panel p-4 transition-colors hover:border-zinc-600"
                onClick={() => router.push("/studio/?id=" + r.id)}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="truncate text-sm font-medium text-zinc-100">{r.name}</div>
                  <button
                    className="rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(r.id);
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                    </svg>
                  </button>
                </div>
                <div className="mb-3 flex h-16 items-center justify-center rounded-lg border border-edge2 bg-canvas">
                  <svg width="30" height="38" viewBox="0 0 30 38" fill="none" stroke="#3f3f46" strokeWidth="1.2">
                    <rect x="1" y="1" width="28" height="36" rx="2" />
                    <line x1="6" y1="8" x2="24" y2="8" />
                    <line x1="6" y1="13" x2="18" y2="13" />
                    <line x1="6" y1="20" x2="24" y2="20" />
                    <line x1="6" y1="24" x2="24" y2="24" />
                    <line x1="6" y1="28" x2="20" y2="28" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{r.branches} branch{r.branches === 1 ? "" : "es"}</Badge>
                  <Badge>{r.versions} version{r.versions === 1 ? "" : "s"}</Badge>
                  <span className="ml-auto text-[10px] text-zinc-600">{timeAgo(r.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-edge py-4 text-center text-[11px] text-zinc-600">
        Fully local · no account · your data never leaves this browser
      </footer>

      <Modal open={creating} onClose={() => setCreating(false)} title="New resume">
        <div className="space-y-4">
          <Input
            value={name}
            onChange={setName}
            placeholder="e.g. Software Engineer 2026"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete resume">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            This deletes the resume and all of its branches and versions from local storage. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (confirmDelete) await deleteResume(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
