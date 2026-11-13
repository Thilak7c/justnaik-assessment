import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { locationsApi, uploadApi } from '../api/endpoints'
import type { ListParams, LocationInput } from '../api/types'

/**
 * Server state lives in React Query. The map and the list both read the SAME query result,
 * so they can never disagree. After any change we invalidate ['locations'] and both refresh.
 */
export const locationKeys = {
  all: ['locations'] as const,
  list: (params: ListParams) => ['locations', 'list', params] as const,
}

export function useLocationList(params: ListParams) {
  return useQuery({
    queryKey: locationKeys.list(params),
    // The query key includes q/page, so a slow response for an OLD search can never be shown
    // for the NEW search. React Query also aborts the old request via `signal`.
    queryFn: ({ signal }) => locationsApi.list(params, signal),
    // While the next page/search loads we keep the previous rows on screen but clearly marked
    // as "updating" (see LocationList) instead of flashing an empty list.
    placeholderData: keepPreviousData,
  })
}

function useInvalidateLocations() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: locationKeys.all })
}

export function useCreateLocation() {
  const invalidate = useInvalidateLocations()
  return useMutation({ mutationFn: (input: LocationInput) => locationsApi.create(input), onSuccess: invalidate })
}

export function useUpdateLocation() {
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: LocationInput }) => locationsApi.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteLocation() {
  const invalidate = useInvalidateLocations()
  return useMutation({ mutationFn: (id: number) => locationsApi.remove(id), onSuccess: invalidate })
}

export function useUploadLocations() {
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (p: number) => void }) => uploadApi.uploadZip(file, onProgress),
    onSuccess: invalidate,
  })
}
