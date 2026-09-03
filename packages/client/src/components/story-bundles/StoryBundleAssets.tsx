// ──────────────────────────────────────────────
// Story Bundle Assets Tab
// ──────────────────────────────────────────────
// Controlled folder-scope picker for a bundle's Game Mode assets (music,
// ambient, SFX, sprites, backgrounds). Deliberately does NOT reuse
// GameAssetsBrowserView — that component is hard-wired to the active chat's
// metadata via useUpdateChatMetadata, and a bundle draft has no chat yet.
// Instead this reuses the same pure selection model (lib/game-asset-selection)
// and the same tree query, so the resulting `excludedFolders` list behaves
// identically to the native "Adjust Game Assets for this Game" selector once
// DirectInject copies it onto the new game's chat metadata.
import { useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, FolderOpen, Loader2 } from "lucide-react";
import { useGameAssetTree, type TreeNode } from "../../hooks/use-game-assets";
import {
  excludeGameAssetFolder,
  getGameAssetFolderSelectionStatus,
  includeGameAssetFolder,
  type GameAssetSelectionStatus,
} from "../../lib/game-asset-selection";
import { HOME_CHAT_MODE_ACCENTS } from "../../lib/home-chat-mode-style";
import { cn } from "../../lib/utils";

export interface StoryBundleAssetsProps {
  excludedFolders: string[];
  onExcludedFoldersChange: (excludedFolders: string[]) => void;
}

function FolderRow({
  node,
  depth,
  excludedFolders,
  onExcludedFoldersChange,
}: {
  node: TreeNode;
  depth: number;
  excludedFolders: string[];
  onExcludedFoldersChange: (excludedFolders: string[]) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(depth < 1);
  const childFolders = (node.children ?? []).filter((child) => child.type === "folder");
  const status = getGameAssetFolderSelectionStatus(node.path, excludedFolders);
  const statusLabel: Record<GameAssetSelectionStatus, string> = {
    included: t("storyBundles.assetsStatusIncluded", "Included"),
    partial: t("storyBundles.assetsStatusPartial", "Partial"),
    excluded: t("storyBundles.assetsStatusExcluded", "Excluded"),
  };

  const handleStatusClick = () => {
    onExcludedFoldersChange(
      status === "excluded"
        ? includeGameAssetFolder(node.path, excludedFolders)
        : excludeGameAssetFolder(node.path, excludedFolders),
    );
  };

  return (
    <div>
      <div
        className="flex items-center gap-1.5 rounded-md py-1 pr-1.5 hover:bg-[var(--accent)]/50"
        style={{ paddingLeft: `${depth * 1.25 + 0.375}rem` }}
      >
        {childFolders.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            aria-label={
              expanded
                ? t("storyBundles.assetsCollapseFolder", "Collapse")
                : t("storyBundles.assetsExpandFolder", "Expand")
            }
          >
            <ChevronRight size="0.8rem" className={cn("transition-transform", expanded && "rotate-90")} />
          </button>
        ) : (
          <span className="w-[1.15rem] shrink-0" />
        )}
        <FolderOpen size="0.8rem" className="shrink-0 text-[var(--muted-foreground)]" />
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">{node.name}</span>
        <button
          type="button"
          data-testid={`story-bundle-assets-folder-status-${node.path}`}
          onClick={handleStatusClick}
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium transition-all",
            status === "excluded"
              ? "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
              : status === "partial"
                ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--primary)]"
                : "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]",
          )}
        >
          {statusLabel[status]}
        </button>
      </div>
      {expanded &&
        childFolders.map((child) => (
          <FolderRow
            key={child.path}
            node={child}
            depth={depth + 1}
            excludedFolders={excludedFolders}
            onExcludedFoldersChange={onExcludedFoldersChange}
          />
        ))}
    </div>
  );
}

export function StoryBundleAssets({ excludedFolders, onExcludedFoldersChange }: StoryBundleAssetsProps) {
  const { t } = useTranslation();
  const { data: tree, isLoading } = useGameAssetTree();

  const rootFolders = useMemo(() => (tree?.children ?? []).filter((child) => child.type === "folder"), [tree]);

  return (
    <div data-testid="story-bundle-editor-assets" className="flex flex-col gap-4">
      <section
        style={{ "--home-chat-mode-accent": HOME_CHAT_MODE_ACCENTS.game } as CSSProperties}
        className="rounded-lg border border-[var(--home-chat-mode-accent)]/70 bg-[var(--home-chat-mode-accent)]/[0.03] p-3"
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="mari-chrome-text-strong text-sm font-semibold">{t("storyBundles.assets", "Game Assets")}</h3>
          <span
            data-testid="story-bundle-editor-assets-gm-settings-label"
            className="rounded-full bg-[var(--home-chat-mode-accent)]/15 px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--home-chat-mode-accent)]"
          >
            {t("storyBundles.gmSettingsLabel", "GM Settings")}
          </span>
        </div>
        <p className="mb-3 text-xs text-[var(--muted-foreground)]">
          {t(
            "storyBundles.assetsHint",
            "Limit which music, ambient sound, sound effects, sprite, and background folders this bundle's game may use. Everything is included by default.",
          )}
        </p>

        {excludedFolders.length > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span>
              {t("storyBundles.assetsExcludedCount", "{{count}} folder(s) excluded", {
                count: excludedFolders.length,
              })}
            </span>
            <button
              type="button"
              data-testid="story-bundle-assets-reset"
              onClick={() => onExcludedFoldersChange([])}
              className="font-medium text-[var(--primary)] hover:underline"
            >
              {t("storyBundles.assetsResetAll", "Reset to all")}
            </button>
          </div>
        )}

        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-[var(--muted-foreground)]">
              <Loader2 size="0.875rem" className="animate-spin" />
              {t("storyBundles.loadingAssets", "Loading assets…")}
            </div>
          ) : rootFolders.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-[var(--muted-foreground)]">
              {t("storyBundles.assetsEmpty", "No game asset folders found.")}
            </div>
          ) : (
            rootFolders.map((folder) => (
              <FolderRow
                key={folder.path}
                node={folder}
                depth={0}
                excludedFolders={excludedFolders}
                onExcludedFoldersChange={onExcludedFoldersChange}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
