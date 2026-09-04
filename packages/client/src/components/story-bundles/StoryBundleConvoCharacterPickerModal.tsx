// ──────────────────────────────────────────────
// "Who do you want to message?" character picker — Click 2 of the CONVO DirectInject flow
// ──────────────────────────────────────────────
// Multi-select: the player picks one or more of the bundle's characters to
// start a group conversation (1:n) with. The first bundle character is
// pre-selected as a sensible default; the player may add or remove any of the
// bundle's characters before committing.
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, UserRound } from "lucide-react";
import { Modal } from "../ui/Modal";
import { useCharacters } from "../../hooks/use-characters";
import { parseCharacterDisplayData } from "../../lib/character-display";
import { cn } from "../../lib/utils";
import type { ConvoDirectInjectBundle } from "../../lib/story-bundle-convo-direct-inject";

export interface StoryBundleConvoCharacterPickerModalProps {
  bundle: ConvoDirectInjectBundle | null;
  isConfirming: boolean;
  onConfirm: (characterIds: string[]) => void;
  onCancel: () => void;
}

interface CharacterOption {
  id: string;
  name: string;
  avatarPath: string | null;
}

export function StoryBundleConvoCharacterPickerModal({
  bundle,
  isConfirming,
  onConfirm,
  onCancel,
}: StoryBundleConvoCharacterPickerModalProps) {
  const { t } = useTranslation();
  const { data: allCharacters } = useCharacters();
  const bundleCharacterIds = useMemo(() => new Set(bundle?.characterIds ?? []), [bundle?.characterIds]);
  const options = useMemo<CharacterOption[]>(() => {
    const rows = (allCharacters ?? []) as Array<{ id: string; data: unknown; avatarPath?: string | null }>;
    return rows
      .filter((row) => bundleCharacterIds.has(row.id))
      .map((row) => ({
        id: row.id,
        name: parseCharacterDisplayData(row).name,
        avatarPath: row.avatarPath ?? null,
      }));
  }, [allCharacters, bundleCharacterIds]);

  const defaultCharacterId = bundle?.characterIds[0] ?? null;
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);

  // Reset the selection to the bundle's first character every time a new bundle is queued.
  useEffect(() => {
    setSelectedCharacterIds(defaultCharacterId ? [defaultCharacterId] : []);
  }, [defaultCharacterId]);

  const toggleCharacter = (characterId: string) => {
    setSelectedCharacterIds((current) =>
      current.includes(characterId) ? current.filter((id) => id !== characterId) : [...current, characterId],
    );
  };

  return (
    <Modal
      open={!!bundle}
      onClose={onCancel}
      title={t("storyBundles.whoToMessageTitle", "Who do you want to message?")}
      width="max-w-sm"
      testId="story-bundle-convo-character-picker-modal"
      closeDisabled={isConfirming}
    >
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-[var(--muted-foreground)]">
          {t(
            "storyBundles.whoToMessageHint",
            "Pick one or more of this bundle's characters to start a conversation with.",
          )}
        </p>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5">
          {options.length === 0 && (
            <div className="py-4 text-center text-xs text-[var(--muted-foreground)]">
              {t("storyBundles.noCharactersAvailable", "No characters available.")}
            </div>
          )}
          {options.map((character) => {
            const selected = selectedCharacterIds.includes(character.id);
            return (
              <button
                key={character.id}
                type="button"
                data-testid={`story-bundle-convo-character-picker-option-${character.id}`}
                onClick={() => toggleCharacter(character.id)}
                disabled={isConfirming}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                  selected ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "hover:bg-[var(--accent)]",
                )}
              >
                {character.avatarPath ? (
                  <img
                    src={character.avatarPath}
                    alt={character.name}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <UserRound size="1.1rem" className="shrink-0 text-[var(--muted-foreground)]" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{character.name}</span>
                {selected && <Check size="0.9rem" className="shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            data-testid="story-bundle-convo-character-picker-cancel"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("storyBundles.cancel", "Cancel")}
          </button>
          <button
            type="button"
            data-testid="story-bundle-convo-character-picker-confirm"
            onClick={() => onConfirm(selectedCharacterIds)}
            disabled={isConfirming || selectedCharacterIds.length === 0}
            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConfirming
              ? t("storyBundles.convoStarting", "Starting…")
              : t("storyBundles.convoStart", "Start Conversation")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
