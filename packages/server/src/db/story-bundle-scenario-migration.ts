type Row = Record<string, unknown>;

/**
 * Story Bundle "Intros" were renamed to "Scenarios": `name`/`text` became
 * `title`/`openingMessage`, and an optional `imagePath`/`avatarCrop` pair was
 * added. Existing installs still hold rows written under the legacy `intros`
 * column; migrate them into `scenarios` on read so saved bundles keep their
 * content instead of silently losing it once the schema drops the old column.
 *
 * Idempotent: rows without a legacy `intros` column are returned untouched.
 */
export function migrateLegacyStoryBundleScenariosRow(row: Row): Row {
  if (!("intros" in row)) return row;

  let legacyIntros: unknown[] = [];
  if (typeof row.intros === "string") {
    try {
      const parsed = JSON.parse(row.intros);
      if (Array.isArray(parsed)) legacyIntros = parsed;
    } catch {
      legacyIntros = [];
    }
  }

  const scenarios = legacyIntros
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      title: typeof entry.name === "string" ? entry.name : "",
      openingMessage: typeof entry.text === "string" ? entry.text : "",
      imagePath: null,
      avatarCrop: null,
    }))
    .filter((entry) => entry.id.length > 0);

  const migrated: Row = { ...row, scenarios: JSON.stringify(scenarios) };
  delete migrated.intros;
  return migrated;
}
