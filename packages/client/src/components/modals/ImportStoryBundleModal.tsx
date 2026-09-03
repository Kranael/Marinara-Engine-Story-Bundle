// ──────────────────────────────────────────────
// Modal: Import Story Bundle
// ──────────────────────────────────────────────
// Accepts only .storybundle archives (see services/import/story-bundle-archive-import.ts),
// uploaded via multipart to /story-bundles/import-archive. Self-contained,
// bootstrapped silently server-side — no embedded-content choice, no
// missing-agent prompt to resolve here. The legacy .marinara.json envelope
// format is no longer accepted by this modal.
// ──────────────────────────────────────────────
import { useState, useRef } from "react";
import { Modal } from "../ui/Modal";
import { Download, FileArchive, CheckCircle, XCircle, Loader2 } from "lucide-react";
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

  /** Upload a .storybundle ZIP archive via multipart to the archive endpoint. */
  const importArchiveFile = async (file: File): Promise<{ filename: string; success: boolean; message: string }> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await api.upload<{ id?: string; name?: string }>("/story-bundles/import-archive", formData);
      return {
        filename: file.name,
        success: true,
        message: t("storyBundles.importedAs", {
          name: data.name ?? "Story Bundle",
          defaultValue: "Imported “{{name}}”",
        }),
      };
    } catch (error) {
      return {
        filename: file.name,
        success: false,
        message: error instanceof Error ? error.message : t("storyBundles.importFailed", "Import failed"),
      };
    }
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setStatus("loading");
    setResults([]);

    const isArchive = (file: File) => file.name.toLowerCase().endsWith(".storybundle");
    const archiveFiles = files.filter(isArchive);
    const rejectedFiles = files.filter((file) => !isArchive(file));

    const nextResults: Array<{ filename: string; success: boolean; message: string }> = await Promise.all(
      archiveFiles.map(importArchiveFile),
    );
    for (const file of rejectedFiles) {
      nextResults.push({
        filename: file.name,
        success: false,
        message: t("storyBundles.importNotAStoryBundle", "Not a valid story bundle file."),
      });
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
      testId="story-bundle-import-modal"
    >
      <div className="flex flex-col gap-4">
        <div
          data-testid="story-bundle-import-drop-zone"
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
          <p className="text-sm font-medium">
            {t("storyBundles.importDropHint", "Drop one or more story bundle files here or click to browse")}
          </p>
          <span className="flex items-center gap-1 rounded-full bg-[var(--secondary)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">
            <FileArchive size="0.75rem" /> {t("storyBundles.importFormat", ".storybundle")}
          </span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".storybundle"
          multiple
          className="hidden"
          data-testid="story-bundle-import-file-input"
          onChange={(e) => {
            handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

        {status === "loading" && (
          <div
            data-testid="story-bundle-import-loading"
            className="flex items-center gap-2 rounded-lg bg-[var(--secondary)] p-3 text-xs"
          >
            <Loader2 size="0.875rem" className="animate-spin text-[var(--primary)]" />{" "}
            {t("storyBundles.importing", "Importing…")}
          </div>
        )}
        {status === "done" && results.length > 0 && (
          <div data-testid="story-bundle-import-results" className="flex flex-col gap-2">
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
            data-testid="story-bundle-import-close-button"
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
