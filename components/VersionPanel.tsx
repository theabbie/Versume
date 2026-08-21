"use client";

import React, { useState } from "react";
import { useStudio } from "@/lib/store";
import { Button, Input, Modal, Badge } from "./ui";
import { shortId } from "@/lib/ids";

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return (
    (sameDay ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " ") +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

const BRANCH_COLORS = ["#fafafa", "#a1a1aa", "#6e6e77", "#d4d4d8", "#52525b", "#8b8b94"];

export default function VersionPanel() {
  const doc = useStudio((s) => s.doc);
  const dirty = useStudio((s) => s.isDirty());
  const { switchBranch, checkout, branchFrom, deleteBranch, renameBranch, commit } = useStudio();
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [branchOpen, setBranchOpen] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!doc) return null;

  const branches = Object.values(doc.branches).sort((a, b) => a.createdAt - b.createdAt);

  function branchColor(id: string): string {
    const i = branches.findIndex((b) => b.id === id);
    return BRANCH_COLORS[i % BRANCH_COLORS.length];
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-edge px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Version control</span>
          {dirty ? <Badge tone="amber">uncommitted</Badge> : <Badge tone="green">clean</Badge>}
        </div>
        <Button variant="primary" size="sm" className="mt-2 w-full justify-center" disabled={!dirty} onClick={() => setCommitOpen(true)}>
          Commit version
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {branches.map((b) => {
          const seen = new Set<string>();
          const versions: typeof doc.versions[string][] = [];
          let cursor = b.headVersionId;
          while (cursor && doc.versions[cursor] && !seen.has(cursor)) {
            seen.add(cursor);
            versions.push(doc.versions[cursor]);
            cursor = doc.versions[cursor].parents[0] ?? null;
          }
          versions.sort((a, c) => c.createdAt - a.createdAt);
          const isCurrent = doc.draftBranchId === b.id;
          const open = expanded[b.id] ?? true;
          return (
            <div key={b.id} className="border-b border-edge">
              <div
                className={"group flex cursor-pointer items-center gap-2 px-3 py-2 " + (isCurrent ? "bg-panel2" : "hover:bg-panel2/60")}
                onClick={() => switchBranch(b.id)}
              >
                <button
                  className="text-zinc-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((s) => ({ ...s, [b.id]: !open }));
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d={open ? "M6 9l6 6 6-6" : "M9 6l6 6-6 6"} />
                  </svg>
                </button>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: branchColor(b.id) }} />
                {renaming === b.id ? (
                  <input
                    className="w-20 rounded border border-edge2 bg-canvas px-1 py-0.5 text-xs text-zinc-100 outline-none"
                    value={renameVal}
                    autoFocus
                    onChange={(e) => setRenameVal(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renameBranch(b.id, renameVal.trim() || b.name);
                        setRenaming(null);
                      }
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    onBlur={() => setRenaming(null)}
                  />
                ) : (
                  <span className="truncate text-xs font-medium text-zinc-200">{b.name}</span>
                )}
                {isCurrent && <Badge tone="green">checked out</Badge>}
                <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="rounded p-1 text-zinc-600 hover:text-zinc-200"
                    title="Rename branch"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming(b.id);
                      setRenameVal(b.name);
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 3a2.8 2.8 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  {b.id !== doc.defaultBranchId && (
                    <button
                      className="rounded p-1 text-zinc-600 hover:text-red-400"
                      title="Delete branch pointer (versions are kept)"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBranch(b.id);
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                      </svg>
                    </button>
                  )}
                </span>
              </div>
              {open && (
                <div className="pb-1">
                  {versions.length === 0 && (
                    <div className="px-8 py-1 text-[10px] text-zinc-600">empty branch - commit to create its first version</div>
                  )}
                  {versions.map((v) => {
                    const isHead = b.headVersionId === v.id;
                    const foreign = v.branchId !== b.id;
                    return (
                      <div key={v.id} className="group/v relative flex items-start gap-2 px-3 py-1.5 hover:bg-panel2/60">
                        <div className="flex w-4 flex-col items-center self-stretch">
                          <span
                            className={
                              "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 " +
                              (isHead ? "border-zinc-100 bg-zinc-100" : "border-zinc-600 bg-transparent")
                            }
                            style={isHead ? { borderColor: branchColor(b.id), background: branchColor(b.id) } : {}}
                          />
                          <span className="w-px flex-1 bg-edge2" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[11px] font-medium text-zinc-200">{v.message}</span>
                            {isHead && <Badge>HEAD</Badge>}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-600">
                            <span className="font-mono">{shortId(v.id)}</span>
                            <span>·</span>
                            <span>{fmtTime(v.createdAt)}</span>
                            {foreign && (
                              <>
                                <span>·</span>
                                <span className="text-zinc-500">from {doc.branches[v.branchId]?.name ?? "main"}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/v:opacity-100">
                          <button
                            className="rounded border border-edge2 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                            title="Check out this version into the working copy"
                            onClick={() => checkout(v.id)}
                          >
                            checkout
                          </button>
                          <button
                            className="rounded border border-edge2 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                            title="Create a new branch starting at this version"
                            onClick={() => {
                              setBranchOpen(v.id);
                              setBranchName("");
                            }}
                          >
                            branch
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-edge p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => {
            const head = doc.branches[doc.draftBranchId]?.headVersionId;
            setBranchOpen(head ?? Object.keys(doc.versions)[0] ?? null);
            setBranchName("");
          }}
        >
          New branch from HEAD
        </Button>
      </div>

      <Modal open={commitOpen} onClose={() => setCommitOpen(false)} title="Commit version">
        <div className="space-y-4">
          <Input
            value={commitMsg}
            onChange={setCommitMsg}
            placeholder="What changed? e.g. Tailored for Staff SWE @ Acme"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit(commitMsg.trim() || "Update");
                setCommitMsg("");
                setCommitOpen(false);
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-600">
              on branch <span className="text-zinc-300">{doc.branches[doc.draftBranchId]?.name}</span>
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCommitOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  commit(commitMsg.trim() || "Update");
                  setCommitMsg("");
                  setCommitOpen(false);
                }}
              >
                Commit
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!branchOpen} onClose={() => setBranchOpen(null)} title="Branch from version">
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">
            A new branch pointer will start at version{" "}
            <span className="font-mono text-zinc-300">{branchOpen ? shortId(branchOpen) : ""}</span> and becomes the
            working copy.
          </p>
          <Input
            value={branchName}
            onChange={setBranchName}
            placeholder="e.g. acme-staff-swe"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && branchOpen) {
                branchFrom(branchOpen, branchName.trim() || "branch");
                setBranchOpen(null);
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setBranchOpen(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (branchOpen) branchFrom(branchOpen, branchName.trim() || "branch");
                setBranchOpen(null);
              }}
            >
              Create branch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
