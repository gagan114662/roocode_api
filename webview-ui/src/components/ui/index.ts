// Export React types
import { type ChangeEvent } from 'react';

// Export components with correct folder paths
export { Input } from './input/index';
export { Label } from './label/index';

// Export types
export type { InputProps } from './input/index';
export type { LabelProps } from './label/index';
export type { ChangeEvent };

// Export commonly used interfaces
export interface BaseProps {
  className?: string;
}
