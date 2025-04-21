import posthog, { PostHog } from 'posthog-js'

/**
 * Initialize PostHog analytics with environment-specific configuration
 */
const initPostHog = (): PostHog => {
    // Only initialize in production
    if (process.env.NODE_ENV === 'production') {
        posthog.init(process.env.POSTHOG_API_KEY || '', {
            api_host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
            loaded: (posthog: PostHog) => {
                if (process.env.NODE_ENV === 'development') {
                    posthog.debug()
                }
            },
            // Disable automatic capture features for privacy
            autocapture: false,
            capture_pageview: false,
            disable_session_recording: true,
            persistence: 'memory'
        })
    }

    return posthog
}

export const analytics = initPostHog()

/**
 * Track an analytics event
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
        analytics.capture(eventName, properties)
    }
}

/**
 * Identify a user for analytics
 */
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
        analytics.identify(userId, traits)
    }
}

/**
 * Reset the analytics user
 */
export const resetUser = () => {
    if (process.env.NODE_ENV === 'production') {
        analytics.reset()
    }
}

export default analytics