import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { uploadApi } from '../api/endpoints'
import { UploadPage } from './UploadPage'

vi.mock('../api/endpoints', () => ({ uploadApi: { uploadZip: vi.fn() }, locationsApi: {}, authApi: {} }))
const uploadZip = vi.mocked(uploadApi.uploadZip)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const zipFile = (name = 'locations.zip') => new File(['PK...'], name, { type: 'application/zip' })

describe('<UploadPage />', () => {

  it('rejects a non-zip file before uploading', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage()
    await user.upload(screen.getByLabelText('ZIP file'), new File(['x'], 'locations.txt', { type: 'text/plain' }))
    expect(screen.getByText('Please choose a .zip file.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled()
  })

  it('shows a confirmation with the import summary', async () => {
    uploadZip.mockResolvedValue({ message: 'Imported 2 new locations.', totalRows: 2, inserted: 2, skippedDuplicates: 0 })
    const user = userEvent.setup()
    renderPage()
    await user.upload(screen.getByLabelText('ZIP file'), zipFile())
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('Imported 2 new locations.')).toBeInTheDocument()
    expect(screen.getByText(/2 rows read · 2 added · 0 duplicates skipped/)).toBeInTheDocument()
  })

  it('lists invalid lines returned by the server and keeps the file for a retry', async () => {
    const headers = new AxiosHeaders()
    uploadZip.mockImplementation(async () => {
      throw new AxiosError('fail', 'ERR_BAD_REQUEST', { headers }, null, {
        status: 422,
        statusText: '',
        headers: {},
        config: { headers },
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: '2 invalid rows found. Nothing was saved.',
            details: [
              { line: 3, message: 'Name is empty' },
              { line: 4, message: 'Latitude "abc" is not a number' },
            ],
          },
        },
      })
    })
    const user = userEvent.setup()
    renderPage()
    await user.upload(screen.getByLabelText('ZIP file'), zipFile())
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('2 invalid rows found. Nothing was saved.')).toBeInTheDocument()
    expect(screen.getByText('Line 3: Name is empty')).toBeInTheDocument()
    expect(screen.getByText('Line 4: Latitude "abc" is not a number')).toBeInTheDocument()
    expect(screen.getByText(/Selected: locations.zip/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled()
  })
})
