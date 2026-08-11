// ──────────────────────────────────────────────
// React Query: Story Bundle hooks
// ──────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import type { StoryBundle, StoryBundleVersion, CreateStoryBundleInput, UpdateStoryBundleInput } from "@marinara-engine/shared";

export const storyBundleKeys = {
  all: ["story-bundles"] as const,
  list: () => [...storyBundleKeys.all, "list"] as const,
  detail: (id: string) => [...storyBundleKeys.all, "detail", id] as const,
  versions: (id: string) => [...storyBundleKeys.all, "versions", id] as const,
};

export function useStoryBundles() {
  return useQuery({
    queryKey: storyBundleKeys.list(),
    queryFn: () => api.get<StoryBundle[]>("/story-bundles"),
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60_000,
  });
}

export function useStoryBundle(id: string | null) {
  return useQuery({
    queryKey: storyBundleKeys.detail(id ?? ""),
    queryFn: () => api.get<StoryBundle>(`/story-bundles/${id}`),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });
}

export function useCreateStoryBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStoryBundleInput) => api.post<StoryBundle>("/story-bundles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: storyBundleKeys.all }),
  });
}

export function useUpdateStoryBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateStoryBundleInput & { id: string }) =>
      api.patch<StoryBundle>(`/story-bundles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: storyBundleKeys.all }),
  });
}

export function useDeleteStoryBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/story-bundles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: storyBundleKeys.all }),
  });
}

export function useUploadStoryBundleImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, image }: { id: string; image: string }) =>
      api.post<StoryBundle>(`/story-bundles/${id}/image`, { image }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: storyBundleKeys.all });
      qc.invalidateQueries({ queryKey: storyBundleKeys.list() });
      qc.invalidateQueries({ queryKey: storyBundleKeys.detail(variables.id) });
    },
  });
}

export function useStoryBundleVersions(bundleId: string | null) {
  return useQuery({
    queryKey: storyBundleKeys.versions(bundleId ?? ""),
    queryFn: () => api.get<StoryBundleVersion[]>(`/story-bundles/${bundleId}/versions`),
    enabled: !!bundleId,
    staleTime: 2 * 60_000,
  });
}

export function useCreateStoryBundleVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, source, reason }: { id: string; source?: string; reason?: string }) =>
      api.post<StoryBundleVersion>(`/story-bundles/${id}/versions`, { source, reason }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: storyBundleKeys.versions(variables.id) });
    },
  });
}

export function useDeleteStoryBundleVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bundleId, versionId }: { bundleId: string; versionId: string }) =>
      api.delete(`/story-bundles/${bundleId}/versions/${versionId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: storyBundleKeys.versions(variables.bundleId) });
    },
  });
}

export function useDeleteAllStoryBundleVersions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bundleId: string) => api.delete(`/story-bundles/${bundleId}/versions`),
    onSuccess: (_data, bundleId) => {
      qc.invalidateQueries({ queryKey: storyBundleKeys.versions(bundleId) });
    },
  });
}

export function useRestoreStoryBundleVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bundleId, versionId }: { bundleId: string; versionId: string }) =>
      api.post(`/story-bundles/${bundleId}/versions/${versionId}/restore`, {}),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: storyBundleKeys.all });
      qc.invalidateQueries({ queryKey: storyBundleKeys.detail(variables.bundleId) });
      qc.invalidateQueries({ queryKey: storyBundleKeys.versions(variables.bundleId) });
    },
  });
}

export function useRenameStoryBundleVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bundleId, versionId, version }: { bundleId: string; versionId: string; version: string }) =>
      api.patch<StoryBundleVersion>(`/story-bundles/${bundleId}/versions/${versionId}`, { version }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: storyBundleKeys.versions(variables.bundleId) });
    },
  });
}
