export type DrawTool = 'pencil' | 'pen' | 'marker' | 'fountain' | 'eraser' | 'ruler' | 'text' | 'shape';
export type ShapeType = 'line' | 'arrow' | 'rect' | 'circle' | 'triangle';

export interface DrawSettings {
  tool: DrawTool;
  color: string;
  width: number;
  opacity: number;
  drawWithFinger: boolean;
  palmRejection: boolean;
  shapeType: ShapeType;
  shapeFill: boolean;
}
