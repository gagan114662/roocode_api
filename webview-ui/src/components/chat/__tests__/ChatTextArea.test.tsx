import * as React from 'react'
import { render, screen, fireEvent, within } from '../../../test-utils'
import { VSCodeTextArea } from '@vscode/webview-ui-toolkit/react'
import ChatTextArea from '../ChatTextArea'
import { useExtensionState } from '../../../context/ExtensionStateContext'
import { vscode } from '../../../utils/vscode'
import { defaultModeSlug } from '../../../../../src/shared/modes'
import * as pathMentions from '../../../utils/path-mentions'

// Register VS Code web components
customElements.define('vscode-text-area', VSCodeTextArea as any)

// Mock modules that aren't components
jest.mock('../../../utils/vscode', () => ({
  vscode: {
    postMessage: jest.fn()
  }
}))

jest.mock('../../../utils/path-mentions', () => ({
  convertToMentionPath: jest.fn((path, cwd) => {
    if (cwd && path.toLowerCase().startsWith(cwd.toLowerCase())) {
      const relativePath = path.substring(cwd.length)
      return "@" + (relativePath.startsWith("/") ? relativePath : "/" + relativePath)
    }
    return path
  })
}))

jest.mock('../../../context/ExtensionStateContext')

const mockPostMessage = vscode.postMessage as jest.Mock
const mockConvertToMentionPath = pathMentions.convertToMentionPath as jest.Mock

describe('ChatTextArea', () => {
  const defaultProps = {
    inputValue: '',
    setInputValue: jest.fn(),
    onSend: jest.fn(),
    textAreaDisabled: false,
    selectApiConfigDisabled: false,
    onSelectImages: jest.fn(),
    shouldDisableImages: false,
    placeholderText: 'Type a message...',
    selectedImages: [],
    setSelectedImages: jest.fn(),
    onHeightChange: jest.fn(),
    mode: defaultModeSlug,
    setMode: jest.fn(),
    modeShortcutText: '(⌘. for next mode)'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock implementation for useExtensionState
    ;(useExtensionState as jest.Mock).mockReturnValue({
      filePaths: [],
      openedTabs: [],
      apiConfiguration: {
        apiProvider: 'anthropic'
      }
    })
  })

  it('renders with placeholder text', () => {
    render(<ChatTextArea {...defaultProps} />)
    const textarea = screen.getByPlaceholderText(defaultProps.placeholderText)
    expect(textarea).toBeInTheDocument()
  })

  it('handles text input', async () => {
    const setInputValue = jest.fn()
    render(<ChatTextArea {...defaultProps} setInputValue={setInputValue} />)
    
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hello world' } })
    
    expect(setInputValue).toHaveBeenCalledWith('Hello world')
  })

  it('handles Enter key to send message', () => {
    const onSend = jest.fn()
    render(
      <ChatTextArea 
        {...defaultProps} 
        inputValue="Test message" 
        onSend={onSend}
      />
    )

    const textarea = screen.getByRole('textbox')
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' })
    
    expect(onSend).toHaveBeenCalled()
  })

  it('disables textarea when textAreaDisabled is true', () => {
    render(<ChatTextArea {...defaultProps} textAreaDisabled={true} />)
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('disabled')
  })

  it('updates input value on file drop', () => {
    const setInputValue = jest.fn()
    const { container } = render(
      <ChatTextArea 
        {...defaultProps} 
        setInputValue={setInputValue}
        inputValue="Initial text"
      />
    )

    const dataTransfer = {
      getData: jest.fn().mockReturnValue('/test/file1.js\n/test/file2.js'),
      files: []
    }

    fireEvent.drop(container.querySelector('.chat-text-area')!, {
      dataTransfer,
      preventDefault: jest.fn()
    })

    expect(mockConvertToMentionPath).toHaveBeenCalledTimes(2)
    expect(setInputValue).toHaveBeenCalled()
  })
})
