import type { Location } from '../api/types'
import { Button } from './ui'

interface Props {
  items: Location[]
  selectedId: number | null
  deletingId: number | null
  /** true while the next page/search is loading and the rows shown are the previous result */
  updating: boolean
  search: string
  onSelect: (l: Location) => void
  onEdit: (l: Location) => void
  onDelete: (l: Location) => void
}

export function LocationList({ items, selectedId, deletingId, updating, search, onSelect, onEdit, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        {search ? (
          <>No locations match “{search}”.</>
        ) : (
          <>
            You have no locations yet.
            <br />
            Add one with the form above or upload a ZIP file.
          </>
        )}
      </div>
    )
  }

  return (
    <ul
      className={`divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white transition-opacity ${updating ? 'pointer-events-none opacity-50' : ''}`}
      aria-busy={updating}
      aria-label="Your locations"
    >
      {items.map((l) => {
        const selected = l.id === selectedId
        return (
          <li key={l.id} className={`flex items-center gap-2 px-3 py-2 ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
            <button type="button" onClick={() => onSelect(l)} className="min-w-0 flex-1 text-left" aria-pressed={selected}>
              <p className="truncate text-sm font-medium">{l.name}</p>
              <p className="text-xs text-slate-500">
                {l.latitude.toFixed(6)}, {l.longitude.toFixed(6)}
              </p>
            </button>
            <Button variant="ghost" className="px-2 py-1" onClick={() => onEdit(l)} aria-label={`Edit ${l.name}`}>
              Edit
            </Button>
            <Button
              variant="ghost"
              className="px-2 py-1 text-red-600 hover:bg-red-50"
              loading={deletingId === l.id}
              disabled={deletingId !== null}
              onClick={() => onDelete(l)}
              aria-label={`Delete ${l.name}`}
            >
              Delete
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
