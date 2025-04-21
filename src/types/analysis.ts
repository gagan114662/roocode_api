export interface ImageElement {
  type: 'text' | 'code' | 'ui' | 'error' | 'other';
  content: string;
  confidence: number;
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ImageAnalysis {
  description: string;
  elements: ImageElement[];
  recommendations?: string[];
}
