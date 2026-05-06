const pool = require('../config/db');

const ocrFromImage = async (req, res) => {
  try {
    const { image, mime_type = 'image/png', mode = 'default' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Cal enviar una imatge en base64' });
    }

    // Límit: ~5MB en base64 = ~7MB de string
    if (image.length > 7_000_000) {
      return res.status(400).json({
        error: 'Imatge massa gran. Comprimir-la a menys de 5MB.'
      });
    }

    const isHandwriting = mode === 'handwriting';

    const promptText = isHandwriting
      ? `Eres un sistema de reconocimiento de escritura manuscrita.
El usuario ha dibujado texto con un lápiz digital sobre fondo negro.
Los trazos aparecen en color blanco.
Reconoce exactamente qué texto o letra ha escrito.
Si es una sola letra, devuelve solo esa letra.
Si son varias letras o palabras, devuélvelas tal cual.
Responde SOLO con el texto reconocido, sin explicaciones, sin puntuación extra, sin comillas.`
      : `Analiza esta imagen (pizarra, papel, captura de pantalla o apunte) y extrae TODO el contenido visible.

Si detectas ecuaciones, fórmulas o operaciones matemáticas, RESUÉLVELAS paso a paso y muestra el resultado final.

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta, sin texto adicional ni bloques de código markdown:
{
  "title": "título principal si hay, o null si no hay",
  "content_markdown": "todo el contenido en formato markdown incluyendo resolución de operaciones",
  "has_formulas": true,
  "has_tables": false,
  "language": "es"
}

REGLAS para el campo content_markdown:
- Fórmulas matemáticas inline: $E = mc^2$
- Fórmulas matemáticas en bloque: $$\\int_0^\\infty f(x)\\,dx$$
- Si hay una ecuación o operación matemática:
  1. Muestra primero la expresión detectada: **Expresión:** $...$
  2. Luego resuélvela paso a paso bajo el título **## Resolución**
  3. Indica el resultado final: **Resultado:** $...$
- Tablas: formato markdown estándar | Col1 | Col2 |\\n|---|---|
- Jerarquía: # para títulos principales, ## para subtítulos
- Listas: - para puntos, 1. 2. 3. para numeradas
- Negrita para conceptos clave: **concepto**
- Si no puedes leer alguna parte: [ilegible]
- NO añadas comentarios ni explicaciones fuera del JSON`;

    // Crida a GPT-4o (no gpt-4o-mini — necessitem alta precisió per fórmules)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: isHandwriting ? 100 : 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mime_type};base64,${image}`,
                  detail: 'high',
                },
              },
              { type: 'text', text: promptText },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(
        errData.error?.message || `Error OpenAI: ${response.status}`
      );
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content.trim();

    // Handwriting mode: return simple { type, content } directly
    let parsed;
    if (isHandwriting) {
      parsed = { type: 'text', content: rawContent };
    } else {
      // Parse JSON — elimina possibles blocs ```json ... ``` que GPT pot afegir
      try {
        const clean = rawContent
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();
        parsed = JSON.parse(clean);
      } catch {
        // Si no és JSON vàlid, retorna el text com a content_markdown
        parsed = {
          title: null,
          content_markdown: rawContent,
          has_formulas: false,
          has_tables: false,
          language: 'ca',
        };
      }
    }

    // Guarda el log d'ús a ai_usage_logs
    const tokensUsed = data.usage?.total_tokens || 0;
    await pool.query(
      `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, req.body.note_id || null, 'ocr', tokensUsed]
    );

    // Incrementa el comptador mensual de la IA
    await pool.query(
      `UPDATE users
       SET ai_uses_this_month = ai_uses_this_month + 1
       WHERE id = $1`,
      [req.user.id]
    );

    res.json(parsed);
  } catch (err) {
    console.error('OCR error:', err.message);
    res.status(500).json({ error: 'Error intern' });
  }
};

module.exports = { ocrFromImage };
