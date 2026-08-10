import type { Page } from '@playwright/test';

export interface StoryBundle {
  id: string;
  name: string;
  description: string | null;
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
}
