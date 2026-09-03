// ──────────────────────────────────────────────
// "Who are you?" persona picker — Click 2 of the Start Adventure flow
// ──────────────────────────────────────────────
// Deliberately minimal: a single-purpose confirm step, not a full picker tab
// like StoryBundlePersonas.tsx. Defaults to the bundle's own persona (rule 4:
// a recommendation, not enforced) but every persona in the library stays
// selectable — the bundle's persona is only ever a suggestion.
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, UserRound } from "lucide-react";
import type { StoryBundle } from "@marinara-engine/shared";
import { Modal } from "../ui/Modal";
import { usePersonas } from "../../hooks/use-characters";
import { cn } from "../../lib/utils";
import { DIRECT_INJECT_STEP_PERCENT, type DirectInjectStep } from "../../lib/story-bundle-direct-inject";

export interface StoryBundlePersonaPickerModalProps {
  bundle: StoryBundle | null;
  isConfirming: boolean;
  /** Which DirectInject step is in flight — drives the progress bar while confirming. */
  step: DirectInjectStep | null;
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
  step,
  onConfirm,
  onCancel,
}: StoryBundlePersonaPickerModalProps) {
  const { t } = useTranslation();
  const { data: allPersonas } = usePersonas();
  const options = useMemo(() => (allPersonas ?? []) as PersonaOption[], [allPersonas]);
  const bundlePersonaIds = useMemo(() => new Set(bundle?.personaIds ?? []), [bundle?.personaIds]);

  const defaultPersonaId = bundle?.personaIds[0] ?? null;
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(defaultPersonaId);

  // Reset the selection to the bundle's default every time a new bundle is queued.
  useEffect(() => {
    setSelectedPersonaId(defaultPersonaId);
  }, [defaultPersonaId]);

  // The world-setup step is the only unbounded, AI-driven one — its percentage
  // never moves, so a ticking elapsed-seconds counter is what actually shows
  // it's still working (same convention GameSetupWizard uses for its own
  // world-generation wait).
  const [worldSetupElapsedSeconds, setWorldSetupElapsedSeconds] = useState(0);
  useEffect(() => {
    if (step !== "world-setup") {
      setWorldSetupElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const updateElapsed = () => setWorldSetupElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1_000);
    return () => window.clearInterval(interval);
  }, [step]);

  const stepLabels: Record<DirectInjectStep, string> = {
    creating: t("storyBundles.gmStepCreating", "Creating game session…"),
    tagging: t("storyBundles.gmStepTagging", "Applying story bundle settings…"),
    "world-setup": t("storyBundles.gmStepWorldSetup", "Generating the world…"),
    done: t("storyBundles.gmStepDone", "Ready!"),
  };
  const stepPercent = step ? DIRECT_INJECT_STEP_PERCENT[step] : 0;

  return (
    <Modal
      open={!!bundle}
      onClose={onCancel}
      title={t("storyBundles.whoAreYouTitle", "Who are you?")}
      width="max-w-sm"
      testId="story-bundle-persona-picker-modal"
      closeDisabled={isConfirming}
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
                disabled={isConfirming}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
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
                {bundlePersonaIds.has(persona.id) && (
                  <span className="shrink-0 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[0.5625rem] font-semibold text-[var(--accent-foreground)]">
                    {t("storyBundles.personaBundleDefault", "Bundle")}
                  </span>
                )}
                {selected && <Check size="0.9rem" className="shrink-0" />}
              </button>
            );
          })}
        </div>

        {isConfirming && step && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[0.6875rem] font-medium text-[var(--foreground)]">
              <span role="status" aria-live="polite">
                {stepLabels[step]}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--muted-foreground)]">
                {step === "world-setup"
                  ? t("storyBundles.gmElapsedSeconds", "{{count}}s", { count: worldSetupElapsedSeconds })
                  : t("storyBundles.gmStepPercent", "{{percent}}%", { percent: stepPercent })}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                role="progressbar"
                aria-valuenow={stepPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={stepLabels[step]}
                className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${stepPercent}%` }}
              />
            </div>
          </div>
        )}

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
              ? t("storyBundles.gmStarting", "Starting…")
              : t("storyBundles.startAdventure", "Start Adventure")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
