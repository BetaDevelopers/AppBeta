export type FloatingObjectType = 'stroke' | 'shape' | 'image' | 'ocr-scan' | 'equation' | 'connector' | 'text' | 'sticker';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface FloatingObject {
  id: string;
  type: FloatingObjectType;

  position: {
    x: number;
    y: number;
  };

  dimensions: {
    width: number;
    height: number;
  };

  // SVG path data with coordinates relative to the object's own bounding box
  svgData?: string;

  // For OCR scan objects
  imageBase64?: string;
  ocrText?: string;

  // For equation objects (LaTeX source)
  latexSource?: string;

  // For connector objects
  sourceId?: string;
  targetId?: string;
  arrowStart?: boolean;
  arrowEnd?: boolean;

  isSelected: boolean;
  rotation: number;

  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  stickerEmoji?: string;
  textContent?: string;
  fontSize?: number;
}
