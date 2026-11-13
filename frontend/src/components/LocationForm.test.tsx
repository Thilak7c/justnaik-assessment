import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { LocationForm } from './LocationForm'

function serverError(status: number, body: unknown) {
  const headers = new AxiosHeaders()
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', { headers }, null, {
    status,
    statusText: '',
    data: body,
    headers: {},
    config: { headers },
  })
}

async function fill(name: string, lat: string, lng: string) {
  const user = userEvent.setup()
  if (name) await user.type(screen.getByLabelText('Name'), name)
  if (lat) await user.type(screen.getByLabelText('Latitude'), lat)
  if (lng) await user.type(screen.getByLabelText('Longitude'), lng)
  return user
}

describe('<LocationForm />', () => {
  it('shows validation errors and does not submit invalid input', async () => {
    const onSubmit = vi.fn()
    render(<LocationForm editing={null} onSubmit={onSubmit} />)
    const user = await fill('', '95', 'abc')
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Latitude must be between -90 and 90')).toBeInTheDocument()
    expect(screen.getByText('Longitude must be a number')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits once even when clicked repeatedly, and disables the button while saving', async () => {
    let resolve!: () => void
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    render(<LocationForm editing={null} onSubmit={onSubmit} />)
    const user = await fill('Suria KLCC', '3.157324409', '101.7121981')

    const button = screen.getByRole('button', { name: 'Add location' })
    await user.click(button)
    await user.click(button)
    await user.click(button)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 })
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()

    resolve()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add location' })).toBeEnabled())
    expect(screen.getByLabelText('Name')).toHaveValue('') // cleared after success
  })

  it('keeps the user input and shows the server message when saving fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      serverError(409, { error: { code: 'CONFLICT', message: 'You already have a location with this name at these coordinates' } }),
    )
    render(<LocationForm editing={null} onSubmit={onSubmit} />)
    const user = await fill('Suria KLCC', '3.15', '101.71')
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('You already have a location')
    expect(screen.getByLabelText('Name')).toHaveValue('Suria KLCC')
    expect(screen.getByLabelText('Latitude')).toHaveValue('3.15')
    expect(screen.getByLabelText('Longitude')).toHaveValue('101.71')
  })

  it('shows a friendly message when the server cannot be reached', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    render(<LocationForm editing={null} onSubmit={onSubmit} />)
    const user = await fill('A', '1', '1')
    await user.click(screen.getByRole('button', { name: 'Add location' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    expect(screen.getByLabelText('Name')).toHaveValue('A')
  })

  it('prefills values in edit mode', () => {
    render(
      <LocationForm
        editing={{ id: 1, name: 'Zoo Negara', latitude: 3.2105416, longitude: 101.75920504, createdAt: '', updatedAt: '' }}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Zoo Negara')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })
})
