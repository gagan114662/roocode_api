import {
  VSCodeButton,
  VSCodeCheckbox,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
  VSCodeRadioGroup,
  VSCodeRadio,
  VSCodeLink,
  VSCodeProgressRing,
} from '@vscode/webview-ui-toolkit/react'

// Register VS Code web components for testing
customElements.define('vscode-button', VSCodeButton as any)
customElements.define('vscode-checkbox', VSCodeCheckbox as any)
customElements.define('vscode-dropdown', VSCodeDropdown as any)
customElements.define('vscode-option', VSCodeOption as any)
customElements.define('vscode-text-field', VSCodeTextField as any)
customElements.define('vscode-radio-group', VSCodeRadioGroup as any)
customElements.define('vscode-radio', VSCodeRadio as any)
customElements.define('vscode-link', VSCodeLink as any)
customElements.define('vscode-progress-ring', VSCodeProgressRing as any)

// Add global VS Code styling
document.body.classList.add('vscode-light')