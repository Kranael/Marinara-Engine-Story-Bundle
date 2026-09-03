// ──────────────────────────────────────────────
// "Who are you?" persona picker — Click 2 of the Start Adventure flow
// ──────────────────────────────────────────────
// Deliberately minimal: a single-purpose confirm step, not a full picker tab
// like StoryBundlePersonas.tsx. Defaults to the bundle's own persona (rule 4:
// a recommendation, not enforced) but lets the player swap to any persona.
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, UserRound } from "lucide-react";
import type { StoryBundle } from "@marinara-engine/shared";
import { Modal } from "../ui/Modal";
import { usePersonas } from "../../hooks/use-characters";
import { cn } from "../../lib/utils";

export interface StoryBundlePersonaPickerModalProps {
  bundle: StoryBundle | null;
  isConfirming: boolean;
  onConfirm: (personaId: string | null) => void;
  onCancel: () => void;
}

interface PersonaOption {
  id: string;
  name: string;
  avatarPath?: string | null;
}

export function StoryBundlePersonaPickerModal({
  bundle,
  isConfirming,
  onConfirm,
  onCancel,
}: StoryBundlePersonaPickerModalProps) {
  const { t } = useTranslation();
  const { data: allPersonas } = usePersonas();
  const personas = useMemo(() => (allPersonas ?? []) as PersonaOption[], [allPersonas]);

  const defaultPersonaId = bundle?.personaIds[0] ?? null;
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(defaultPersonaId);

  // Reset the selection to the bundle's default every time a new bundle is queued.
  useEffect(() => {
    setSelectedPersonaId(defaultPersonaId);
  }, [defaultPersonaId]);

  const bundlePersonas = useMemo(
    () => personas.filter((p) => bundle?.personaIds.includes(p.id)),
    [personas, bundle?.personaIds],
  );
  // Fall back to the full library if the bundle didn't ship with a persona.
  const options = bundlePersonas.length > 0 ? bundlePersonas : personas;

  return (
    <Modal
      open={!!bundle}
      onClose={onCancel}
      title={t("storyBundles.whoAreYouTitle", "Who are you?")}
      width="max-w-sm"
      testId="story-bundle-persona-picker-modal"
    >
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-[var(--muted-foreground)]">
          {t(
            "storyBundles.whoAreYouHint",
            "Pick the persona you'll play as. The bundle's own persona is picked by default.",
          )}
        </p>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5">
          {options.length === 0 && (
            <div className="py-4 text-center text-xs text-[var(--muted-foreground)]">
              {t("storyBundles.noPersonasAvailable", "No personas available.")}
            </div>
          )}
          {options.map((persona) => {
            const selected = selectedPersonaId === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                data-testid={`story-bundle-persona-picker-option-${persona.id}`}
                onClick={() => setSelectedPersonaId(persona.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-all",
                  selected ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "hover:bg-[var(--accent)]",
                )}
              >
                {persona.avatarPath ? (
                  <img
                    src={persona.avatarPath}
                    alt={persona.name}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <UserRound size="1.1rem" className="shrink-0 text-[var(--muted-foreground)]" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{persona.name}</span>
                {selected && <Check size="0.9rem" className="shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            data-testid="story-bundle-persona-picker-cancel"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("storyBundles.cancel", "Cancel")}
          </button>
          <button
            type="button"
            data-testid="story-bundle-persona-picker-confirm"
            onClick={() => onConfirm(selectedPersonaId)}
            disabled={isConfirming}
            className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConfirming
              ? t("storyBundles.playStarted", "Starting…")
              : t("storyBundles.startAdventure", "Start Adventure")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
