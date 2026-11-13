import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getErrorDetails, getErrorMessage } from '../api/errors'
import type { UploadResult } from '../api/types'
import { useToast } from '../components/Toaster'
import { Alert, Button } from '../components/ui'
import { useUploadLocations } from '../hooks/useLocations'

const MAX_BYTES = 5 * 1024 * 1024

export function UploadPage() {
  const toast = useToast()
  const upload = useUploadLocations()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<UploadResult | null>(null)

  function chooseFile(f: File | null) {
    setResult(null)
    upload.reset()
    setClientError(null)
    if (!f) return setFile(null)
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setClientError('Please choose a .zip file.')
      return setFile(null)
    }
    if (f.size > MAX_BYTES) {
      setClientError('The file is larger than 5 MB.')
      return setFile(null)
    }
    setFile(f)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file || upload.isPending) return // no double submission
    setProgress(0)
    try {
      const res = await upload.mutateAsync({ file, onProgress: setProgress })
      setResult(res)
      toast(res.message)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      // Error is rendered below from upload.error; the chosen file is kept so the user can retry.
    }
  }

  const errorDetails = upload.isError ? getErrorDetails(upload.error) : []

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Upload locations</h1>
        <p className="text-sm text-slate-500">Import many locations at once from a ZIP file.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold">File format</h2>
        <ul className="mb-3 list-inside list-disc space-y-1 text-slate-600">
          <li>A .zip containing exactly one .txt file (max 5 MB)</li>
          <li>One location per line: Name, Latitude, Longitude (the header line is optional)</li>
          <li>If any line is invalid, nothing is imported. Locations you already have are skipped.</li>
        </ul>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {`Name, Latitude, Longitude\nSuria KLCC,3.157324409,101.7121981\nZoo Negara,3.21054160,101.75920504`}
        </pre>
        <a href="/sample-locations.zip" download className="mt-2 inline-block text-blue-600 hover:underline">
          Download a sample ZIP
        </a>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="Upload form">
        <label htmlFor="zip" className="block text-sm font-medium text-slate-700">
          ZIP file
        </label>
        <input
          ref={inputRef}
          id="zip"
          type="file"
          accept=".zip,application/zip"
          disabled={upload.isPending}
          onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && (
          <p className="text-xs text-slate-500">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
        {clientError && <Alert tone="error">{clientError}</Alert>}

        {upload.isPending && (
          <div className="h-2 overflow-hidden rounded bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.max(progress, 5)}%` }} />
          </div>
        )}

        <Button type="submit" loading={upload.isPending} disabled={!file}>
          {upload.isPending ? (progress < 100 ? `Uploading… ${progress}%` : 'Processing…') : 'Upload'}
        </Button>
      </form>

      {upload.isError && (
        <Alert tone="error">
          <p className="font-medium">{getErrorMessage(upload.error, 'Upload failed')}</p>
          {errorDetails.length > 0 && (
            <ul className="mt-2 max-h-60 list-inside list-disc space-y-0.5 overflow-y-auto" aria-label="Upload errors">
              {errorDetails.map((d, i) => (
                <li key={i}>{d.line ? `Line ${d.line}: ${d.message}` : d.message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {result && (
        <Alert tone="success">
          <p className="font-medium">{result.message}</p>
          <p>
            {result.totalRows} rows read · {result.inserted} added · {result.skippedDuplicates} duplicates skipped
          </p>
          <Link to="/map" className="font-medium underline">
            View them on the map →
          </Link>
        </Alert>
      )}
    </div>
  )
}
