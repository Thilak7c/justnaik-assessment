import { Button } from './ui'

interface Props {
  page: number
  totalPages: number
  total: number
  disabled?: boolean
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, disabled, onChange }: Props) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <span>
        {total} {total === 1 ? 'location' : 'locations'}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="px-2 py-1" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
          ‹ Prev
        </Button>
        <span aria-live="polite">
          Page {page} of {totalPages}
        </span>
        <Button variant="secondary" className="px-2 py-1" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>
          Next ›
        </Button>
      </div>
    </div>
  )
}
