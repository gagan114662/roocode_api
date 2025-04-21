import * as React from 'react'
import { render, screen } from '../../test-utils'
import { Button } from '../button'

describe('Button', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary')
  })

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    
    const button = screen.getByRole('button', { name: /secondary/i })
    expect(button).toHaveClass('bg-secondary')
  })

  it('renders with outline variant', () => {
    render(<Button variant="outline">Outline</Button>)
    
    const button = screen.getByRole('button', { name: /outline/i })
    expect(button).toHaveClass('border', 'border-input')
  })

  it('renders with different sizes', () => {
    render(
      <>
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
      </>
    )
    
    expect(screen.getByRole('button', { name: /small/i })).toHaveClass('h-8')
    expect(screen.getByRole('button', { name: /default/i })).toHaveClass('h-9')
    expect(screen.getByRole('button', { name: /large/i })).toHaveClass('h-10')
  })

  it('forwards additional props', () => {
    const onClick = jest.fn()
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>
    )
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeDisabled()
    
    button.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('combines custom className with variants', () => {
    render(
      <Button className="custom-class" variant="secondary">
        Custom
      </Button>
    )
    
    const button = screen.getByRole('button', { name: /custom/i })
    expect(button).toHaveClass('custom-class', 'bg-secondary')
  })
})