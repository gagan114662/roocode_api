import * as React from 'react'
import { render, screen, userEvent, within } from '../../../test-utils'
import { VSCodeTextField, VSCodeRadioGroup } from '@vscode/webview-ui-toolkit/react'
import ApiOptions from '../ApiOptions'
import { ApiConfiguration } from '../../../../../src/shared/api'

// Initialize actual VS Code components instead of mocks
customElements.define('vscode-text-field', VSCodeTextField as any)
customElements.define('vscode-radio-group', VSCodeRadioGroup as any)

describe('ApiOptions', () => {
  const defaultProps = {
    uriScheme: 'vscode',
    apiConfiguration: {} as ApiConfiguration,
    setApiConfigurationField: jest.fn(),
    errorMessage: undefined,
    setErrorMessage: jest.fn(),
  }

  beforeEach(() => {
    window.postMessage = jest.fn()
  })

  it('renders provider selection', () => {
    render(<ApiOptions {...defaultProps} />)
    
    const providerSelect = screen.getByRole('combobox')
    expect(providerSelect).toBeInTheDocument()
  })

  it('shows OpenRouter API key input when OpenRouter provider selected', async () => {
    const user = userEvent.setup()
    render(<ApiOptions {...defaultProps} />)
    
    // Open select dropdown
    const providerSelect = screen.getByRole('combobox')
    await user.click(providerSelect)

    // Select OpenRouter
    const openRouterOption = screen.getByRole('option', { name: /OpenRouter/i })
    await user.click(openRouterOption)

    // Check that API key input appears
    const apiKeyInput = screen.getByLabelText(/OpenRouter API Key/i)
    expect(apiKeyInput).toBeInTheDocument()
  })

  it('shows custom base URL option when enabled', async () => {
    const user = userEvent.setup()
    render(<ApiOptions {...defaultProps} />)
    
    // Select OpenRouter
    const providerSelect = screen.getByRole('combobox')
    await user.click(providerSelect)
    await user.click(screen.getByRole('option', { name: /OpenRouter/i }))

    // Enable custom base URL
    const customUrlCheckbox = screen.getByRole('checkbox', { name: /use custom base url/i })
    await user.click(customUrlCheckbox)

    // Check that base URL input appears
    const baseUrlInput = screen.getByPlaceholderText(/Default: https:\/\/openrouter.ai\/api\/v1/i)
    expect(baseUrlInput).toBeInTheDocument()
  })

  it('calls setApiConfigurationField when settings change', async () => {
    const setApiConfigurationField = jest.fn()
    const user = userEvent.setup()

    render(
      <ApiOptions
        {...defaultProps}
        setApiConfigurationField={setApiConfigurationField}
      />
    )

    // Select OpenRouter provider
    const providerSelect = screen.getByRole('combobox')
    await user.click(providerSelect)
    await user.click(screen.getByRole('option', { name: /OpenRouter/i }))

    expect(setApiConfigurationField).toHaveBeenCalledWith('apiProvider', 'openrouter')
  })
})
