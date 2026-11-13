import { useEffect, useState } from 'react'
import { getErrorMessage } from '../api/errors'
import type { Location, LocationInput } from '../api/types'
import { LocationForm } from '../components/LocationForm'
import { LocationList } from '../components/LocationList'
import { LocationMap } from '../components/LocationMap'
import { Pagination } from '../components/Pagination'
import { useToast } from '../components/Toaster'
import { Alert, Button, inputClass, Spinner } from '../components/ui'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useCreateLocation, useDeleteLocation, useLocationList, useUpdateLocation } from '../hooks/useLocations'

const PAGE_SIZE = 10

/**
 * Map + list page. Both views render the SAME data (the current page of the current search),
 * so what you see in the list is exactly what is on the map.
 */
export function MapPage() {
  const toast = useToast()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput.trim())
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Location | null>(null)
  const [picked, setPicked] = useState<{ lat: number; lng: number; key: number } | null>(null)

  const listQuery = useLocationList({ q: search, page, limit: PAGE_SIZE })
  const createMutation = useCreateLocation()
  const updateMutation = useUpdateLocation()
  const deleteMutation = useDeleteLocation()

  const data = listQuery.data
  const items = data?.items ?? []
  const updating = listQuery.isPlaceholderData && listQuery.isFetching

  // If the current page became empty (e.g. last item deleted), step back one page.
  // (Reacting to server data, so an effect is the right place.)
  useEffect(() => {
    if (data && !listQuery.isPlaceholderData && page > data.totalPages) setPage(data.totalPages)
  }, [data, page, listQuery.isPlaceholderData])

  async function handleSubmit(input: LocationInput) {
    if (editing) {
      const saved = await updateMutation.mutateAsync({ id: editing.id, input })
      toast(`Updated “${saved.name}”`)
      setEditing(null)
      setSelectedId(saved.id)
    } else {
      const saved = await createMutation.mutateAsync(input)
      toast(`Added “${saved.name}”`)
      // Newest locations are listed first, so show page 1 of an unfiltered list to reveal it.
      setSearchInput('')
      setPage(1)
      setSelectedId(saved.id)
    }
  }

  async function handleDelete(location: Location) {
    if (!window.confirm(`Delete “${location.name}”? This cannot be undone.`)) return
    try {
      await deleteMutation.mutateAsync(location.id)
      toast(`Deleted “${location.name}”`)
      if (editing?.id === location.id) setEditing(null)
      if (selectedId === location.id) setSelectedId(null)
    } catch (err) {
      toast(getErrorMessage(err, 'Could not delete the location'), 'error')
    }
  }

  const startEdit = (l: Location) => {
    setEditing(l)
    setSelectedId(l.id)
  }

  return (
    <div className="grid h-full gap-4 p-4 lg:grid-cols-[380px_1fr]">
      <section className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:pr-1">
        <LocationForm
          editing={editing}
          pickedCoords={picked}
          onSubmit={handleSubmit}
          onCancelEdit={() => setEditing(null)}
        />

        <div className="relative">
          <label htmlFor="search" className="sr-only">
            Search locations
          </label>
          <input
            id="search"
            type="search"
            className={inputClass()}
            placeholder="Search by name…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setPage(1) // a new search always starts at page 1
            }}
          />
          {listQuery.isFetching && (
            <Spinner className="absolute right-9 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {listQuery.isPending ? (
          <div className="py-8 text-center">
            <Spinner label="Loading your locations…" />
          </div>
        ) : listQuery.isError && !data ? (
          <Alert
            tone="error"
            action={
              <Button variant="secondary" className="px-2 py-1" onClick={() => listQuery.refetch()}>
                Retry
              </Button>
            }
          >
            {getErrorMessage(listQuery.error, 'Could not load your locations')}
          </Alert>
        ) : (
          <>
            {listQuery.isError && (
              <Alert
                tone="warning"
                action={
                  <Button variant="secondary" className="px-2 py-1" onClick={() => listQuery.refetch()}>
                    Retry
                  </Button>
                }
              >
                Could not refresh: {getErrorMessage(listQuery.error)} Showing the last loaded results.
              </Alert>
            )}
            {updating && <p className="text-xs text-slate-500">Loading results{search ? ` for “${search}”` : ''}…</p>}
            <LocationList
              items={items}
              selectedId={selectedId}
              deletingId={deleteMutation.isPending ? (deleteMutation.variables ?? null) : null}
              updating={updating}
              search={search}
              onSelect={(l) => setSelectedId(l.id)}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
            {data && data.total > 0 && (
              <Pagination page={page} totalPages={data.totalPages} total={data.total} disabled={updating} onChange={setPage} />
            )}
          </>
        )}
      </section>

      <section className="h-[60vh] min-h-[320px] lg:h-auto" aria-label="Map">
        <LocationMap
          locations={updating ? [] : items}
          selectedId={selectedId}
          onSelect={(l) => setSelectedId(l.id)}
          onEdit={startEdit}
          onMapClick={(lat, lng) => setPicked({ lat, lng, key: Date.now() })}
        />
      </section>
    </div>
  )
}
