import type { Page } from '@playwright/test';

export interface StoryBundle {
  id: string;
  name: string;
  description: string | null;
  characterIds: string[];
  personaIds: string[];
  lorebookIds: string[];
  presetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoryBundleInput {
  name: string;
  description?: string | null;
}

/**
 * Thin API wrapper for story bundle CRUD operations in E2E tests.
 * Uses `page.request` so cookies / auth state are automatically included.
 */
export class StoryBundleAPI {
  constructor(private readonly page: Page) {}

  /** Create a story bundle via POST /api/story-bundles. */
  async create(input: CreateStoryBundleInput): Promise<StoryBundle> {
    const response = await this.page.request.post('/api/story-bundles', {
      data: { name: input.name, description: input.description ?? null },
    });
    if (!response.ok()) {
      throw new Error(`Failed to create story bundle: ${response.status()} ${await response.text()}`);
    }
    return (await response.json()) as StoryBundle;
  }

  /** Delete a story bundle via DELETE /api/story-bundles/:id. */
  async delete(id: string): Promise<void> {
    const response = await this.page.request.delete(`/api/story-bundles/${id}`);
    if (!response.ok()) {
      throw new Error(`Failed to delete story bundle ${id}: ${response.status()} ${await response.text()}`);
    }
  }

  /** Import a story bundle from a Marinara export envelope via POST /api/import/marinara. */
  async importFromEnvelope(envelope: Record<string, unknown>): Promise<StoryBundle> {
    const response = await this.page.request.post('/api/import/marinara', {
      data: envelope,
    });
    if (!response.ok()) {
      throw new Error(`Failed to import story bundle: ${response.status()} ${await response.text()}`);
    }
    const result = (await response.json()) as { success: boolean; id?: string; error?: string };
    if (!result.success || !result.id) {
      throw new Error(`Story bundle import returned failure: ${JSON.stringify(result)}`);
    }
    const getResponse = await this.page.request.get(`/api/story-bundles/${result.id}`);
    if (!getResponse.ok()) {
      throw new Error(`Failed to fetch imported story bundle ${result.id}: ${getResponse.status()}`);
    }
    return (await getResponse.json()) as StoryBundle;
  }

  /** Export a story bundle via GET /api/story-bundles/:id/export. */
  async export(id: string): Promise<Record<string, unknown>> {
    const response = await this.page.request.get(`/api/story-bundles/${id}/export`);
    if (!response.ok()) {
      throw new Error(`Failed to export story bundle ${id}: ${response.status()} ${await response.text()}`);
    }
    return (await response.json()) as Record<string, unknown>;
  }

  /** Get version history for a story bundle via GET /api/story-bundles/:id/versions. */
  async getVersions(id: string): Promise<Array<{ id: string; revision: number; version: string; source: string; isCurrent?: boolean }>> {
    const response = await this.page.request.get(`/api/story-bundles/${id}/versions`);
    if (!response.ok()) {
      throw new Error(`Failed to get versions for ${id}: ${response.status()} ${await response.text()}`);
    }
    return (await response.json()) as Array<{ id: string; revision: number; version: string; source: string; isCurrent?: boolean }>;
  }
}
