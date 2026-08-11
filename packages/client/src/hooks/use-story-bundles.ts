// ──────────────────────────────────────────────
// React Query: Story Bundle hooks
// ──────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api-client";
import type { StoryBundle, CreateStoryBundleInput, UpdateStoryBundleInput } from "@marinara-engine/shared";

export const storyBundleKeys = {
  all: ["story-bundles"] as const,
  list: () => [...storyBundleKeys.all, "list"] as const,
  detail: (id: string) => [...storyBundleKeys.all, "detail", id] as const,
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
