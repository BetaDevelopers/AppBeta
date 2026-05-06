/**
 * ocrApi.ts
 * ---------
 * Service to handle OCR processing for handwritten notes and drawings.
 */

export interface OCRResponse {
  type: 'text' | 'latex' | 'svg';
  content: string;
}

/**
 * postCanvasForOcr
 * ---------------
 * Sends a base64 image of the canvas to the AI backend for conversion.
 */
export async function postCanvasForOcr(imageBase64: string): Promise<OCRResponse | null> {
  const token = localStorage.getItem('beta3m_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  
  // Remove the data:image/png;base64, prefix if present
  const base64Content = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  
  const res = await fetch(`${apiUrl}/ai/ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify({ image: base64Content, mode: 'handwriting' })
  });
  
  if (res.status === 403) {
    console.warn('OCR: acceso denegado (plan insuficiente o límite alcanzado)');
    return null;
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `OCR Error: ${res.status}`);
  }
  
  return await res.json();
}
