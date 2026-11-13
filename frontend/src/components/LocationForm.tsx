import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getErrorMessage, getFieldErrors } from '../api/errors'
import type { Location, LocationInput } from '../api/types'
import { validateLocation, type LocationFormErrors, type LocationFormValues } from '../lib/validation'
import { Alert, Button, Field, inputClass } from './ui'

const EMPTY: LocationFormValues = { name: '', latitude: '', longitude: '' }

const toValues = (l: Location | null): LocationFormValues =>
  l ? { name: l.name, latitude: String(l.latitude), longitude: String(l.longitude) } : EMPTY

interface Props {
  /** null = "add" mode, a location = "edit" mode */
  editing: Location | null
  /** Coordinates picked by clicking on the map (key changes on every click). */
  pickedCoords?: { lat: number; lng: number; key: number } | null
  onSubmit: (input: LocationInput) => Promise<unknown>
  onCancelEdit?: () => void
}

/**
 * Add / edit form.
 * - validates on the client first (same rules as the API)
 * - blocks double submission while a request is in flight
 * - keeps what the user typed if the request fails, and shows the server's message
 */
export function LocationForm({ editing, pickedCoords, onSubmit, onCancelEdit }: Props) {
  const [values, setValues] = useState<LocationFormValues>(() => toValues(editing))
  const [errors, setErrors] = useState<LocationFormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // A ref updates synchronously, so even two clicks in the same frame cannot send two requests.
  const inFlight = useRef(false)

  const editingId = editing?.id ?? null
  useEffect(() => {
    setValues(toValues(editing))
    setErrors({})
    setServerError(null)
    // Only reset when switching to a different location (not on every re-render/refetch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  useEffect(() => {
    if (!pickedCoords) return
    setValues((v) => ({ ...v, latitude: pickedCoords.lat.toFixed(6), longitude: pickedCoords.lng.toFixed(6) }))
    setErrors((e) => ({ ...e, latitude: undefined, longitude: undefined }))
  }, [pickedCoords])

  const update = (field: keyof LocationFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (inFlight.current) return

    const { errors: clientErrors, input } = validateLocation(values)
    setErrors(clientErrors)
    setServerError(null)
    if (!input) return

    inFlight.current = true
    setSubmitting(true)
    try {
      await onSubmit(input)
      if (!editing) setValues(EMPTY) // clear only after success
    } catch (err) {
      // Keep the user's input; show field errors (422) and/or the general message.
      setErrors(getFieldErrors(err) as LocationFormErrors)
      setServerError(getErrorMessage(err))
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  const isEdit = Boolean(editing)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Location form">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{isEdit ? 'Edit location' : 'Add a location'}</h2>
        {!isEdit && <span className="text-xs text-slate-500">Tip: click the map to fill coordinates</span>}
      </div>

      {serverError && <Alert tone="error">{serverError}</Alert>}

      <Field label="Name" htmlFor="loc-name" error={errors.name}>
        <input
          id="loc-name"
          className={inputClass(!!errors.name)}
          value={values.name}
          onChange={update('name')}
          maxLength={150}
          placeholder="e.g. Suria KLCC"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'loc-name-error' : undefined}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" htmlFor="loc-lat" error={errors.latitude}>
          <input
            id="loc-lat"
            inputMode="decimal"
            className={inputClass(!!errors.latitude)}
            value={values.latitude}
            onChange={update('latitude')}
            placeholder="3.157324"
            aria-invalid={!!errors.latitude}
          />
        </Field>
        <Field label="Longitude" htmlFor="loc-lng" error={errors.longitude}>
          <input
            id="loc-lng"
            inputMode="decimal"
            className={inputClass(!!errors.longitude)}
            value={values.longitude}
            onChange={update('longitude')}
            placeholder="101.712198"
            aria-invalid={!!errors.longitude}
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={submitting} className="flex-1">
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add location'}
        </Button>
        {isEdit && (
          <Button type="button" variant="secondary" onClick={onCancelEdit} disabled={submitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
