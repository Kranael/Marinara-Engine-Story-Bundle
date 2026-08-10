// ──────────────────────────────────────────────
// Modal: Import Story Bundle (JSON)
// ──────────────────────────────────────────────
import { useState, useRef } from "react";
import { Modal } from "../ui/Modal";
import { Download, FileJson, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api-client";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportStoryBundleModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<Array<{ filename: string; success: boolean; message: string }>>([]);
  const [dragOver, setDragOver] = useState(false);
  const qc = useQueryClient();

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setStatus("loading");
    setResults([]);

    const nextResults: Array<{ filename: string; success: boolean; message: string }> = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);

        // Accept both bare envelopes and wrapped folder manifests
        const envelopes: Record<string, unknown>[] = [];
        if (json && typeof json === "object" && !Array.isArray(json) && (json as Record<string, unknown>).type === "marinara_story_bundle") {
          envelopes.push(json as Record<string, unknown>);
        } else if (Array.isArray((json as Record<string, unknown>).entries)) {
          // Folder manifest — extract story bundle entries
          const entries = (json as Record<string, unknown>).entries as Array<Record<string, unknown>>;
          for (const entry of entries) {
            if (entry && typeof entry === "object" && entry.type === "marinara_story_bundle") {
              envelopes.push(entry);
            }
          }
        }

        if (envelopes.length === 0) {
          nextResults.push({
            filename: file.name,
            success: false,
            message: t("storyBundles.importNotAStoryBundle", "Not a valid story bundle file."),
          });
          continue;
        }

        for (const envelope of envelopes) {
          const data = await api.post<{ success: boolean; id?: string; name?: string; error?: string }>("/import/marinara", envelope);
          nextResults.push({
            filename: file.name,
            success: data.success,
            message: data.success
              ? t("storyBundles.importedAs", { name: data.name ?? "Story Bundle", defaultValue: "Imported “{{name}}”" })
              : (data.error ?? t("storyBundles.importFailed", "Import failed")),
          });
        }
      } catch (error) {
        nextResults.push({
          filename: file.name,
          success: false,
          message: error instanceof Error ? error.message : t("storyBundles.importParseFailed", "Failed to parse file"),
        });
      }
    }

    setResults(nextResults);
    setStatus("done");
    if (nextResults.some((result) => result.success)) {
      qc.invalidateQueries();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const reset = () => {
    setStatus("idle");
    setResults([]);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("storyBundles.importTitle", "Import Story Bundle")}
    >
      <div className="flex flex-col gap-4">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all ${
            dragOver
              ? "border-[var(--primary)] bg-[var(--primary)]/10"
              : "border-[var(--border)] hover:border-[var(--muted-foreground)] hover:bg-[var(--secondary)]/50"
          }`}
        >
          <Download size="2rem" className={dragOver ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"} />
          <p className="text-sm font-medium">{t("storyBundles.importDropHint", "Drop one or more story bundle files here or click to browse")}</p>
          <span className="flex items-center gap-1 rounded-full bg-[var(--secondary)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">
            <FileJson size="0.75rem" /> {t("storyBundles.importFormat", ".marinara.json")}
          </span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

        {status === "loading" && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] p-3 text-xs">
            <Loader2 size="0.875rem" className="animate-spin text-[var(--primary)]" /> {t("storyBundles.importing", "Importing…")}
          </div>
        )}
        {status === "done" && results.length > 0 && (
          <div className="flex flex-col gap-2">
            <div
              className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
                results.some((result) => result.success)
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-[var(--destructive)]/10 text-[var(--destructive)]"
              }`}
            >
              {results.some((result) => result.success) ? <CheckCircle size="0.875rem" /> : <XCircle size="0.875rem" />}
              {results.filter((result) => result.success).length} {t("storyBundles.importSucceeded", "succeeded")}{" "}
              {results.filter((result) => !result.success).length} {t("storyBundles.importFailedCount", "failed")}
            </div>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-[var(--border)]">
              {results.map((result) => (
                <div
                  key={`${result.filename}-${result.message}`}
                  className="flex items-start gap-2 border-b border-[var(--border)] px-3 py-2 text-xs last:border-b-0"
                >
                  {result.success ? (
                    <CheckCircle size="0.8125rem" className="mt-0.5 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle size="0.8125rem" className="mt-0.5 shrink-0 text-[var(--destructive)]" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{result.filename}</div>
                    <div className="text-[var(--muted-foreground)]">{result.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-[var(--border)] pt-3">
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-lg px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)]"
          >
            {t("storyBundles.close", "Close")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
