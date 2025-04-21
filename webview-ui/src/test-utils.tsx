import React from 'react'
import { render as rtlRender, RenderOptions, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n/setup'
import { ThemeProvider } from './theme-provider'
import userEvent from '@testing-library/user-event'

// Re-export everything from @testing-library/react
export * from '@testing-library/react'

// Re-export userEvent
export { userEvent }

interface TestProvidersProps {
  children: React.ReactNode
  theme?: 'dark' | 'light'
}

function TestProviders({ children, theme = 'dark' }: TestProvidersProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider defaultTheme={theme} storageKey="vscode-ui-theme">
        {children}
      </ThemeProvider>
    </I18nextProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'dark' | 'light'
}

function render(
  ui: React.ReactElement,
  { theme = 'dark', ...options }: CustomRenderOptions = {}
) {
  return {
    ...rtlRender(ui, {
      wrapper: (props) => <TestProviders {...props} theme={theme} />,
      ...options,
    }),
    user: userEvent.setup(),
  }
}

// Helper for finding elements within specific containers/components
function withinComponent(testId: string) {
  return within(screen.getByTestId(testId))
}

// Helper for finding buttons by their text content
function findButtonByText(text: string | RegExp) {
  return screen.getByRole('button', { name: text })
}

// Helper for finding interactive elements
function getInteractiveElement(
  type: 'button' | 'textbox' | 'checkbox' | 'combobox',
  name: string | RegExp
) {
  return screen.getByRole(type, { name })
}

export {
  render,
  screen,
  within,
  withinComponent,
  findButtonByText,
  getInteractiveElement,
}