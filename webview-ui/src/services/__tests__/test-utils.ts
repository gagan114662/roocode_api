import posthog, { PostHog } from 'posthog-js'

/**
 * Create a mock PostHog instance for testing
 */
export const createMockAnalytics = (): jest.Mocked<PostHog> => ({
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    alias: jest.fn(),
    reset: jest.fn(),
    group: jest.fn(),
    opt_in_capturing: jest.fn(),
    opt_out_capturing: jest.fn(),
    has_opted_in_capturing: jest.fn(),
    has_opted_out_capturing: jest.fn(),
    debug: jest.fn(),
    register: jest.fn(),
    unregister: jest.fn(),
    register_once: jest.fn(),
    reloadFeatureFlags: jest.fn(),
    onFeatureFlags: jest.fn((callback) => {
        callback()
        return () => {}
    }),
    people: {
        set: jest.fn(),
        set_once: jest.fn()
    },
    toString: jest.fn()
})

/**
 * Get current PostHog mock instance for assertions
 */
export const getPostHogMock = (): jest.Mocked<PostHog> => posthog as jest.Mocked<PostHog>