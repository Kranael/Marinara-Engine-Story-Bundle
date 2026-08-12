import type { Page } from '@playwright/test';
import { readFile } from 'fs/promises';
import type { StoryBundle } from './story-bundle-api';

/**
 * Result returned by the Marinara import API for a story bundle.
 */
interface ImportResult {
  success: boolean;
  type: string;
  id?: string;
  name?: string;
  error?: string;
}

/** Monotonic counter for unique bundle names across parallel workers. */
let _importCounter = 0;

/**
 * Helper to import a story bundle from a .marinara.json fixture file.
 *
 * Reads the JSON file, POSTs it to the /api/import/marinara endpoint,
 * and returns the created StoryBundle (fetched via GET so all fields
 * are populated).
 *
 * The fixture file must be a valid ExportEnvelope with
 * `type: "marinara_story_bundle"`.
 *
 * @example
 * ```ts
 * const bundle = await importStoryBundleFixture(page, './tests/data/story-bundles/empty.json');
 * ```
 */
export async function importStoryBundleFixture(
  page: Page,
  filePath: string,
  nameSuffix?: string,
): Promise<StoryBundle> {
  const raw = await readFile(filePath, 'utf-8');
  const envelope = JSON.parse(raw);

  // Append a unique suffix so parallel tests don't collide on the same name.
  // Uses a monotonic counter + process-specific prefix for cross-worker uniqueness.
  if (envelope.data?.name) {
    const label = nameSuffix ? ` ${nameSuffix}` : "";
    const pid = process.pid.toString(36).slice(-4);
    envelope.data.name = `${envelope.data.name}${label} #${pid}-${++_importCounter}`;
  }

  const response = await page.request.post('/api/import/marinara', {
    data: envelope,
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to import story bundle fixture "${filePath}": ${response.status()} ${await response.text()}`,
    );
  }

  const result = (await response.json()) as ImportResult;

  if (!result.success || !result.id) {
    throw new Error(
      `Story bundle fixture import returned failure: ${JSON.stringify(result)}`,
    );
  }

  // Fetch the full bundle to get all serialized fields
  const getResponse = await page.request.get(`/api/story-bundles/${result.id}`);
  if (!getResponse.ok()) {
    throw new Error(
      `Failed to fetch imported story bundle ${result.id}: ${getResponse.status()}`,
    );
  }

  return (await getResponse.json()) as StoryBundle;
}

/**
 * Build a story bundle export envelope object (for inline use in tests).
 * Does NOT persist — use importStoryBundleFixture or POST to
 * /api/import/marinara to actually create the bundle.
 */
export function buildStoryBundleEnvelope(input: {
  name: string;
  description?: string | null;
  characterIds?: string[];
  personaIds?: string[];
  lorebookIds?: string[];
  presetIds?: string[];
}) {
  return {
    type: 'marinara_story_bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      name: input.name,
      description: input.description ?? null,
      characterIds: input.characterIds ?? [],
      personaIds: input.personaIds ?? [],
      lorebookIds: input.lorebookIds ?? [],
      presetIds: input.presetIds ?? [],
    },
  };
}
