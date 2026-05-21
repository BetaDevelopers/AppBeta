export type DrawTool = 'pencil' | 'pen' | 'marker' | 'fountain' | 'eraser' | 'ruler' | 'text';

export interface DrawSettings {
  tool: DrawTool;
  color: string;
  width: number;
  opacity: number;
  drawWithFinger: boolean;
  palmRejection: boolean;
}
