import { analytics, trackEvent, identifyUser, resetUser } from './analytics'
import posthog from 'posthog-js'

describe('analytics', () => {
    const TEST_API_KEY = 'phc_test_key'
    const TEST_HOST = 'https://test.posthog.com'

    beforeEach(() => {
        process.env.NODE_ENV = 'production'
        process.env.POSTHOG_API_KEY = TEST_API_KEY
        process.env.POSTHOG_HOST = TEST_HOST
    })

    afterEach(() => {
        delete process.env.POSTHOG_API_KEY
        delete process.env.POSTHOG_HOST
        process.env.NODE_ENV = 'development'
    })

    describe('trackEvent', () => {
        it('should send events to PostHog in production', () => {
            const captureSpy = jest.spyOn(posthog, 'capture')
            const eventName = 'test_event'
            const properties = { foo: 'bar' }
            
            trackEvent(eventName, properties)
            
            expect(captureSpy).toHaveBeenCalledWith(eventName, properties)
            captureSpy.mockRestore()
        })

        it('should not send events in development', () => {
            const captureSpy = jest.spyOn(posthog, 'capture')
            process.env.NODE_ENV = 'development'
            
            trackEvent('test_event')
            
            expect(captureSpy).not.toHaveBeenCalled()
            captureSpy.mockRestore()
        })
    })

    describe('identifyUser', () => {
        it('should identify users in production', () => {
            const identifySpy = jest.spyOn(posthog, 'identify')
            const userId = 'test_user'
            const traits = { name: 'Test User' }
            
            identifyUser(userId, traits)
            
            expect(identifySpy).toHaveBeenCalledWith(userId, traits)
            identifySpy.mockRestore()
        })

        it('should not identify users in development', () => {
            const identifySpy = jest.spyOn(posthog, 'identify')
            process.env.NODE_ENV = 'development'
            
            identifyUser('test_user')
            
            expect(identifySpy).not.toHaveBeenCalled()
            identifySpy.mockRestore()
        })
    })

    describe('resetUser', () => {
        it('should reset user in production', () => {
            const resetSpy = jest.spyOn(posthog, 'reset')
            
            resetUser()
            
            expect(resetSpy).toHaveBeenCalled()
            resetSpy.mockRestore()
        })

        it('should not reset user in development', () => {
            const resetSpy = jest.spyOn(posthog, 'reset')
            process.env.NODE_ENV = 'development'
            
            resetUser()
            
            expect(resetSpy).not.toHaveBeenCalled()
            resetSpy.mockRestore()
        })
    })
})