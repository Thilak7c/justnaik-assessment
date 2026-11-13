import { describe, expect, it } from 'vitest'
import { validateCredentials, validateLocation } from './validation'

describe('validateLocation', () => {
  it('returns a parsed input for valid values (trimmed, numbers)', () => {
    const { errors, input } = validateLocation({ name: '  Suria KLCC ', latitude: '3.157324409', longitude: ' 101.7121981' })
    expect(errors).toEqual({})
    expect(input).toEqual({ name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 })
  })

  it.each([
    [{ name: '', latitude: '1', longitude: '1' }, 'name', 'Name is required'],
    [{ name: 'x'.repeat(101), latitude: '1', longitude: '1' }, 'name', 'Name must be at most 100 characters'],
    [{ name: 'A', latitude: '', longitude: '1' }, 'latitude', 'Latitude is required'],
    [{ name: 'A', latitude: 'abc', longitude: '1' }, 'latitude', 'Latitude must be a number'],
    [{ name: 'A', latitude: '1e2', longitude: '1' }, 'latitude', 'Latitude must be a number'],
    [{ name: 'A', latitude: '90.1', longitude: '1' }, 'latitude', 'Latitude must be between -90 and 90'],
    [{ name: 'A', latitude: '1', longitude: '-180.5' }, 'longitude', 'Longitude must be between -180 and 180'],
  ] as const)('rejects %j', (values, field, message) => {
    const { errors, input } = validateLocation(values)
    expect(input).toBeUndefined()
    expect(errors[field]).toBe(message)
  })

  it('accepts the exact boundaries', () => {
    expect(validateLocation({ name: 'Pole', latitude: '-90', longitude: '180' }).input).toBeDefined()
  })
})

describe('validateCredentials', () => {
  it('flags a bad email and a short password', () => {
    expect(validateCredentials('nope', 'short')).toEqual({
      email: 'Enter a valid email address',
      password: 'Password must be at least 8 characters',
    })
  })
  it('passes valid credentials', () => {
    expect(validateCredentials('a@b.co', 'password123')).toEqual({})
  })
})
