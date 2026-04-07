const pool = require('../config/db');

const ocrFromImage = async (req, res) => {
  try {
    const { image, mime_type = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Cal enviar una imatge en base64' });
    }

    // Límit: ~5MB en base64 = ~7MB de string
    if (image.length > 7_000_000) {
      return res.status(400).json({
        error: 'Imatge massa gran. Comprimir-la a menys de 5MB.'
      });
    }

    // Crida a GPT-4o (no gpt-4o-mini — necessitem alta precisió per fórmules)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
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
              {
                type: 'text',
                text: `Analitza aquesta imatge (pissarra, paper, captura de pantalla o apunt) i extreu TOT el contingut visible.

Retorna ÚNICAMENT un objecte JSON vàlid amb aquesta estructura exacta, sense cap text addicional ni blocs de codi markdown:
{
  "title": "títol principal si n'hi ha, o null si no n'hi ha",
  "content_markdown": "tot el contingut en format markdown",
  "has_formulas": true,
  "has_tables": true,
  "language": "ca"
}

REGLES per al camp content_markdown:
- Fórmules matemàtiques inline: $E = mc^2$
- Fórmules matemàtiques en bloc: $$\\int_0^\\infty f(x)\\,dx$$
- Taules: format markdown estàndard | Col1 | Col2 |\\n|---|---|
- Jerarquia: # per títols principals, ## per subtítols, ### per apartats
- Llistes: - per punts, 1. 2. 3. per numerades
- Negreta per conceptes clau: **concepte**
- Si no pots llegir alguna part: [il·legible]
- Preserva l'estructura i ordre originals
- NO afegeixis comentaris ni explicacions fora del JSON`,
              },
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

    // Parse JSON — elimina possibles blocs ```json ... ``` que GPT pot afegir
    let parsed;
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
