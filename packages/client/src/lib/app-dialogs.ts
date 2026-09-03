import {
  useDialogStore,
  type AlertDialogState,
  type AppDialogState,
  type ConfirmDialogState,
  type PromptDialogState,
  type ChoiceDialogState,
  type ScenarioDialogState,
} from "../stores/dialog.store";

type ActiveDialogResolver = {
  kind: AppDialogState["kind"];
  resolve: (value: boolean | string | null | void) => void;
};

let activeResolver: ActiveDialogResolver | null = null;

/**
 * Resolved key prefix for the scenario dialog's "Custom Scenario" option — the
 * remainder of the string is the user's free-text starting-situation description.
 */
export const CUSTOM_SCENARIO_CHOICE_PREFIX = "__marinara_custom_scenario__:";

/**
 * Resolved key for the scenario dialog's always-present "Surprise Me" card
 * (see AppDialogRenderer.tsx). There is no more "None"/empty scenario state —
 * dismissing the dialog resolves to this key instead of null, so a Story
 * Bundle session always gets an opening (AI-improvised by default).
 */
export const SURPRISE_ME_CHOICE_KEY = "__marinara_surprise_me__";

function resolveFallback(kind: AppDialogState["kind"]) {
  if (kind === "confirm") return false;
  if (kind === "prompt") return null;
  if (kind === "choice") return null;
  if (kind === "scenario") return SURPRISE_ME_CHOICE_KEY;
  return undefined;
}

function openDialog<T extends boolean | string | null | void>(dialog: AppDialogState): Promise<T> {
  if (activeResolver) {
    activeResolver.resolve(resolveFallback(activeResolver.kind));
    activeResolver = null;
  }

  useDialogStore.getState().openDialog(dialog);

  return new Promise<T>((resolve) => {
    activeResolver = {
      kind: dialog.kind,
      resolve: resolve as (value: boolean | string | null | void) => void,
    };
  });
}

export function resolveActiveDialog(value: boolean | string | null | void) {
  const resolver = activeResolver;
  activeResolver = null;
  useDialogStore.getState().closeDialog();
  resolver?.resolve(value);
}

export function dismissActiveDialog() {
  const dialog = useDialogStore.getState().dialog;
  if (!dialog) return;
  resolveActiveDialog(resolveFallback(dialog.kind));
}

export function showAlertDialog(options: Omit<AlertDialogState, "kind">): Promise<void> {
  return openDialog<void>({
    kind: "alert",
    confirmLabel: "OK",
    ...options,
  });
}

export function showConfirmDialog(options: Omit<ConfirmDialogState, "kind">): Promise<boolean> {
  return openDialog<boolean>({
    kind: "confirm",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    ...options,
  });
}

export function confirmNonEmptyFolderDelete(
  itemCount: number,
  options: Omit<ConfirmDialogState, "kind">,
): Promise<boolean> {
  if (itemCount <= 0) return Promise.resolve(true);
  return showConfirmDialog(options);
}

export function showPromptDialog(options: Omit<PromptDialogState, "kind">): Promise<string | null> {
  return openDialog<string | null>({
    kind: "prompt",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    ...options,
  });
}

/** A stacked-button choice dialog. Resolves the chosen `key`, or null if dismissed. */
export function showChoiceDialog(options: Omit<ChoiceDialogState, "kind">): Promise<string | null> {
  return openDialog<string | null>({
    kind: "choice",
    cancelLabel: "Cancel",
    ...options,
  });
}

/**
 * A visual-card scenario picker. Always resolves a non-null `key` — dismissing
 * the dialog resolves to `SURPRISE_ME_CHOICE_KEY` rather than null, since
 * "Surprise Me" is the default, never-empty starting state.
 */
export function showScenarioDialog(options: Omit<ScenarioDialogState, "kind">): Promise<string> {
  return openDialog<string>({
    kind: "scenario",
    cancelLabel: "Cancel",
    ...options,
  });
}
