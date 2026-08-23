import type { APIRequestContext } from "@playwright/test";

/**
 * Deterministic API seeding helpers for Story Bundle picker tests.
 *
 * Precondition data is created through REST endpoints (never the UI) so each
 * test stays isolated and independent of execution order. Every create*
 * function returns the created entity id so the caller can clean up.
 */

export interface EntityRef {
  id: string;
  name: string;
}

/** Create a character via POST /api/characters. */
export async function createCharacter(request: APIRequestContext, name: string): Promise<EntityRef> {
  const response = await request.post("/api/characters", {
    data: { data: { name } },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create character "${name}": ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { id: string };
  return { id: body.id, name };
}

/** Delete a character via DELETE /api/characters/:id. */
export async function deleteCharacter(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/characters/${id}`);
}

/** Create a persona via POST /api/characters/personas. */
export async function createPersona(request: APIRequestContext, name: string): Promise<EntityRef> {
  const response = await request.post("/api/characters/personas", {
    data: { name },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create persona "${name}": ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { id: string };
  return { id: body.id, name };
}

/** Delete a persona via DELETE /api/characters/personas/:id. */
export async function deletePersona(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/characters/personas/${id}`);
}

/** Create a character group via POST /api/characters/groups. */
export async function createCharacterGroup(
  request: APIRequestContext,
  name: string,
  characterIds: string[],
): Promise<EntityRef> {
  const response = await request.post("/api/characters/groups", {
    data: { name, characterIds },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create character group "${name}": ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { id: string };
  return { id: body.id, name };
}

/** Delete a character group via DELETE /api/characters/groups/:id. */
export async function deleteCharacterGroup(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/characters/groups/${id}`);
}

/** Create a persona group via POST /api/characters/persona-groups. */
export async function createPersonaGroup(
  request: APIRequestContext,
  name: string,
  personaIds: string[],
): Promise<EntityRef> {
  const response = await request.post("/api/characters/persona-groups", {
    data: { name, personaIds },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create persona group "${name}": ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { id: string };
  return { id: body.id, name };
}

/** Delete a persona group via DELETE /api/characters/persona-groups/:id. */
export async function deletePersonaGroup(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/characters/persona-groups/${id}`);
}

/** Create a lorebook via POST /api/lorebooks. */
export async function createLorebook(request: APIRequestContext, name: string): Promise<EntityRef> {
  const response = await request.post("/api/lorebooks", {
    data: { name },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create lorebook "${name}": ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { id: string };
  return { id: body.id, name };
}

/** Delete a lorebook via DELETE /api/lorebooks/:id. */
export async function deleteLorebook(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/lorebooks/${id}`);
}

/** Create a prompt preset via POST /api/prompts. */
export async function createPreset(
  request: APIRequestContext,
  name: string,
  description = "Story bundle picker test fixture.",
): Promise<EntityRef> {
  const response = await request.post("/api/prompts", {
    data: { name, description },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create preset "${name}": ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { id: string };
  return { id: body.id, name };
}

/** Delete a prompt preset via DELETE /api/prompts/:id. */
export async function deletePreset(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/prompts/${id}`);
}

export interface AgentRef {
  id: string;
  /** The agent type doubles as the picker item id in the agents tab. */
  type: string;
  name: string;
}

/**
 * Create a custom agent config via POST /api/agents.
 *
 * Custom agents are the reliable seeding path in a fresh environment because
 * the built-in agent registry depends on installed capability packages.
 * The returned `type` is the id the agents picker uses for add/remove buttons.
 */
export async function createCustomAgent(request: APIRequestContext, name: string, type?: string): Promise<AgentRef> {
  const agentType = type ?? `sb-picker-agent-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const response = await request.post("/api/agents", {
    data: {
      type: agentType,
      name,
      description: "Story bundle picker test fixture.",
      phase: "post_processing",
      connectionId: null,
      promptTemplate: "Return the original text.",
      settings: {},
    },
  });
  if (!response.ok()) {
    throw new Error(`Failed to create custom agent "${name}": ${response.status()} ${await response.text()}`);
  }
  const body = (await response.json()) as { id: string };
  return { id: body.id, type: agentType, name };
}

/** Delete an agent config via DELETE /api/agents/:id. */
export async function deleteAgent(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/agents/${id}`);
}

/**
 * Generate a unique suffix for entity names so parallel workers never collide.
 * Combines a timestamp with the worker index.
 */
export function entitySuffix(testTitle: string): string {
  const worker = process.env.TEST_WORKER_INDEX ?? "0";
  return `${testTitle.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 24)}-${Date.now().toString(36)}-${worker}`;
}
