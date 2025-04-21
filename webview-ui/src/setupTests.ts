import '@testing-library/jest-dom'
import './test-setup/register-components'

// Setup window.crypto for tests
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: function (buffer: Uint8Array) {
      return crypto.getRandomValues(buffer)
    },
    subtle: crypto.subtle
  },
})

// Setup matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Setup ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
}

// Setup IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
  }
  
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
  takeRecords = () => []
  
  private callback: IntersectionObserverCallback
  private options?: IntersectionObserverInit
}

// Setup fetch
global.fetch = jest.fn()

// Silence React 18 console warnings in test output
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      /Warning: ReactDOM.render is no longer supported in React 18/.test(args[0]) ||
      /Warning: You are importing createRoot/.test(args[0])
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
