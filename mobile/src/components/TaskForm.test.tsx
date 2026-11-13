import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { TaskForm } from './TaskForm'

const input = () => screen.getByLabelText('New task title')
const addButton = () => screen.getByLabelText('Add task')

describe('<TaskForm />', () => {
  it('shows an error and does not call onAdd for an empty title', async () => {
    const onAdd = jest.fn()
    await render(<TaskForm adding={false} onAdd={onAdd} />)
    await fireEvent.press(addButton())
    expect(screen.getByText('Please enter a task title.')).toBeTruthy()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('keeps what the user typed when adding fails', async () => {
    const onAdd = jest.fn().mockRejectedValue(new Error('Cannot reach the server. Check your connection.'))
    await render(<TaskForm adding={false} onAdd={onAdd} />)
    await fireEvent.changeText(input(), 'Buy milk')
    await fireEvent.press(addButton())

    expect(await screen.findByText('Cannot reach the server. Check your connection.')).toBeTruthy()
    expect(input().props.value).toBe('Buy milk')
  })

  it('clears the field after a successful add', async () => {
    const onAdd = jest.fn().mockResolvedValue(undefined)
    await render(<TaskForm adding={false} onAdd={onAdd} />)
    await fireEvent.changeText(input(), 'Buy milk')
    await fireEvent.press(addButton())

    expect(onAdd).toHaveBeenCalledWith('Buy milk')
    await waitFor(() => expect(input().props.value).toBe(''))
  })
})