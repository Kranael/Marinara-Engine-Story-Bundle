// ──────────────────────────────────────────────
// GM "Start Adventure" wizard — Click 2 of the Start Adventure flow
// ──────────────────────────────────────────────
// Single modal, two steps (Persona, then Scenario), mirroring the visual
// language of the native chat setup wizards (dot stepper, Next/Back footer,
// Start button only on the final step) instead of stacking two separate
// modals. The X close button is always present and always cancels, at any
// step — same for the Persona step's "Cancel" button. The Scenario step's
// "Back" button only returns to Persona, it never cancels. A bundle with no
// saved scenarios has just the one Persona step, whose primary button is
// "Start Adventure" directly (nothing to pick, "Surprise Me" is implicit).
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Check, ChevronRight, Dices, Sparkles, UserRound } from "lucide-react";
import { normalizeAvatarCrop, type StoryBundle } from "@marinara-engine/shared";
import { Modal } from "../ui/Modal";
import { usePersonas } from "../../hooks/use-characters";
import { cn, getAvatarCropStyle } from "../../lib/utils";
import { CUSTOM_SCENARIO_CHOICE_PREFIX, SURPRISE_ME_CHOICE_KEY } from "../../lib/app-dialogs";
import {
  buildGameStartOpeningGuideOverride,
  DIRECT_INJECT_STEP_PERCENT,
  type DirectInjectStep,
} from "../../lib/story-bundle-gm-direct-inject";

export interface StoryBundleGmStartModalProps {
  bundle: StoryBundle | null;
  isConfirming: boolean;
  /** Which DirectInject step is in flight — drives the progress bar while confirming. */
  step: DirectInjectStep | null;
  onConfirm: (personaId: string | null, openingGuideOverride: string | null) => void;
  onCancel: () => void;
}

interface PersonaOption {
  id: string;
  name: string;
  avatarPath?: string | null;
}

type WizardStep = "persona" | "scenario";

export function StoryBundleGmStartModal({
  bundle,
  isConfirming,
  step,
  onConfirm,
  onCancel,
}: StoryBundleGmStartModalProps) {
  const { t } = useTranslation();
  const { data: allPersonas } = usePersonas();
  const options = useMemo(() => (allPersonas ?? []) as PersonaOption[], [allPersonas]);
  const bundlePersonaIds = useMemo(() => new Set(bundle?.personaIds ?? []), [bundle?.personaIds]);
  const scenarios = bundle?.scenarios ?? [];
  const hasScenarios = scenarios.length > 0;

  const defaultPersonaId = bundle?.personaIds[0] ?? null;
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(defaultPersonaId);
  const [wizardStep, setWizardStep] = useState<WizardStep>("persona");
  const [customScenarioMode, setCustomScenarioMode] = useState(false);
  const [customScenarioText, setCustomScenarioText] = useState("");

  // Reset every per-bundle draft whenever a new bundle is queued (Click 1).
  useEffect(() => {
    setSelectedPersonaId(defaultPersonaId);
    setWizardStep("persona");
    setCustomScenarioMode(false);
    setCustomScenarioText("");
  }, [bundle?.id, defaultPersonaId]);

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

  /** Resolves a scenario grid choice (a scenario id, Surprise Me, or custom text) into the final commit. */
  const finalize = (choiceKey: string) => {
    let openingGuideOverride: string | null = null;
    if (choiceKey.startsWith(CUSTOM_SCENARIO_CHOICE_PREFIX)) {
      openingGuideOverride = buildGameStartOpeningGuideOverride(
        choiceKey.slice(CUSTOM_SCENARIO_CHOICE_PREFIX.length).trim(),
      );
    } else if (choiceKey !== SURPRISE_ME_CHOICE_KEY) {
      const picked = scenarios.find((s) => s.id === choiceKey);
      if (picked) openingGuideOverride = buildGameStartOpeningGuideOverride(picked.openingMessage);
    }
    onConfirm(selectedPersonaId, openingGuideOverride);
  };

  const wizardSteps: WizardStep[] = hasScenarios ? ["persona", "scenario"] : ["persona"];
  const wizardStepIndex = wizardSteps.indexOf(wizardStep);

  return (
    <Modal
      open={!!bundle}
      onClose={onCancel}
      title={t("storyBundles.startAdventure", "Start Adventure")}
      width={wizardStep === "scenario" ? "max-w-2xl" : "max-w-sm"}
      testId="story-bundle-gm-start-modal"
      closeDisabled={isConfirming}
    >
      <div className="flex flex-col gap-3 p-4">
        {wizardStep === "persona" ? (
          <>
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                {t("storyBundles.whoAreYouTitle", "Who are you?")}
              </h4>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {t(
                  "storyBundles.whoAreYouHint",
                  "Pick the persona you'll play as. The bundle's own persona is picked by default.",
                )}
              </p>
            </div>

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
          </>
        ) : customScenarioMode ? (
          <>
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                {t("storyBundles.customScenario", "Custom Scenario")}
              </h4>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {t("storyBundles.customScenarioPlaceholder", "Describe how the story should begin…")}
              </p>
            </div>
            <textarea
              data-testid="story-bundle-gm-custom-scenario-input"
              value={customScenarioText}
              onChange={(event) => setCustomScenarioText(event.target.value)}
              placeholder={t("storyBundles.customScenarioPlaceholder", "Describe how the story should begin…")}
              rows={5}
              autoFocus
              disabled={isConfirming}
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] disabled:opacity-60"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                data-testid="story-bundle-gm-custom-scenario-back"
                onClick={() => setCustomScenarioMode(false)}
                disabled={isConfirming}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("storyBundles.cancel", "Cancel")}
              </button>
              <button
                type="button"
                data-testid="story-bundle-gm-custom-scenario-confirm"
                disabled={isConfirming || !customScenarioText.trim()}
                onClick={() => finalize(`${CUSTOM_SCENARIO_CHOICE_PREFIX}${customScenarioText.trim()}`)}
                className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("storyBundles.customScenarioStart", "Start Scenario")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                {t("storyBundles.scenarioPickTitle", "Choose a Scenario")}
              </h4>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {t("storyBundles.scenarioPickMessage", "Select a scenario to use as the first message.")}
              </p>
            </div>

            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {/* Static first card — always the default, AI-improvised opening. */}
              {[{ id: SURPRISE_ME_CHOICE_KEY, title: "", imagePath: null, avatarCrop: null }, ...scenarios].map(
                (scenario) => {
                  const isSurpriseMe = scenario.id === SURPRISE_ME_CHOICE_KEY;
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      data-testid={
                        isSurpriseMe
                          ? "story-bundle-gm-scenario-surprise-me"
                          : `story-bundle-gm-scenario-${scenario.id}`
                      }
                      onClick={() => finalize(scenario.id)}
                      disabled={isConfirming}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] text-left transition-transform hover:-translate-y-0.5 hover:shadow-lg disabled:pointer-events-none disabled:opacity-60",
                        isSurpriseMe && "bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900",
                      )}
                    >
                      {isSurpriseMe && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
                          {t("storyBundles.scenarioSurpriseMeBadge", "Default")}
                        </span>
                      )}
                      {isSurpriseMe ? (
                        <div className="flex h-full w-full items-center justify-center text-violet-200">
                          <Dices size="1.75rem" />
                        </div>
                      ) : scenario.imagePath ? (
                        <img
                          src={scenario.imagePath}
                          alt=""
                          className="h-full w-full object-cover"
                          style={getAvatarCropStyle(normalizeAvatarCrop(scenario.avatarCrop))}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)]/25 to-[var(--primary)]/5 text-[var(--muted-foreground)]">
                          <BookOpen size="1.5rem" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pb-2 pt-6">
                        <span className="line-clamp-2 text-xs font-semibold text-white drop-shadow">
                          {isSurpriseMe ? t("storyBundles.scenarioSurpriseMe", "Surprise Me") : scenario.title}
                        </span>
                      </div>
                    </button>
                  );
                },
              )}
            </div>

            <button
              type="button"
              data-testid="story-bundle-gm-custom-scenario-button"
              onClick={() => setCustomScenarioMode(true)}
              disabled={isConfirming}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--ring)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size="0.875rem" />
              {t("storyBundles.customScenario", "Custom Scenario")}
            </button>
          </>
        )}

        {isConfirming && step ? (
          <div className="space-y-1.5 border-t border-[var(--border)]/70 pt-3">
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
        ) : (
          !customScenarioMode && (
            <div className="flex flex-col gap-2 border-t border-[var(--border)]/70 pt-3">
              {wizardSteps.length > 1 && (
                <div className="flex items-center justify-center gap-1.5">
                  {wizardSteps.map((s, i) => (
                    <span
                      key={s}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === wizardStepIndex
                          ? "w-5 bg-[var(--primary)]"
                          : i < wizardStepIndex
                            ? "w-3 bg-[var(--primary)]/45"
                            : "w-1.5 bg-[var(--muted-foreground)]/25",
                      )}
                    />
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid={
                    wizardStep === "persona" ? "story-bundle-gm-wizard-cancel" : "story-bundle-gm-wizard-back"
                  }
                  onClick={() => (wizardStep === "persona" ? onCancel() : setWizardStep("persona"))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                >
                  {wizardStep === "persona"
                    ? t("storyBundles.cancel", "Cancel")
                    : t("ui.noodle.noodlerframe.back", "Back")}
                </button>
                {wizardStep === "persona" && hasScenarios ? (
                  <button
                    type="button"
                    data-testid="story-bundle-gm-wizard-next"
                    onClick={() => setWizardStep("scenario")}
                    className="flex items-center justify-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
                  >
                    {t("onboarding.actions.next", "Next")}
                    <ChevronRight size="0.8125rem" />
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="story-bundle-persona-picker-confirm"
                    onClick={() => finalize(SURPRISE_ME_CHOICE_KEY)}
                    className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] hover:opacity-90"
                  >
                    {t("storyBundles.startAdventure", "Start Adventure")}
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </Modal>
  );
}
