import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'

describe('App scaffold', () => {
  it('renders the product heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Coaching Center Manager' })).toBeInTheDocument()
  })

  it('states that the app runs fully offline', () => {
    render(<App />)
    expect(screen.getByText(/fully offline/i)).toBeInTheDocument()
  })
})
