const pool = require('../config/db');

/**
 * POST /api/ai/math-ocr
 * Body: { strokes?: [{x,y}[][]] , imageBase64?: string }
 * Returns: { isEquation: boolean, latex: string, confidence: number }
 *
 * Si s'envia imageBase64 s'usa directament  (PNG/JPEG en base64).
 * Si s'envia strokes[], es genera una imatge vectorial inline SVG
 * i es codifica a base64 per enviar a GPT-4o Vision.
 */
const mathOCR = async (req, res) => {
  try {
    const { strokes = [], imageBase64 } = req.body;

    if (!imageBase64 && (!strokes || strokes.length === 0)) {
      return res.status(400).json({
        error: "Cal enviar 'imageBase64' o 'strokes' amb almenys un traç.",
      });
    }

    // ── 1. Prepara la imatge a enviar a l'API ─────────────────────────────
    let base64Image;
    let mimeType = 'image/png';

    if (imageBase64) {
      // Imatge ja en base64 (pot portar el prefix data:...)
      base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    } else {
      // Converteix strokes → SVG inline → base64 per no dependre de canvas
      const svgContent = strokesToSVG(strokes);
      base64Image = Buffer.from(svgContent).toString('base64');
      mimeType = 'image/svg+xml';
    }

    // Límit ~5MB
    if (base64Image.length > 7_000_000) {
      return res.status(400).json({ error: 'Imatge massa gran (> 5MB).' });
    }

    // ── 2. Crida GPT-4o (vision) ──────────────────────────────────────────
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `Ets un expert en reconeixement d'escriptura matemàtica a mà.
La teva tasca és analitzar imatges de dibuixos o escriptura a mà i detectar si contenen expressions matemàtiques.

Regles de conversió LaTeX:
- Fraccions: a/b → \\frac{a}{b}
- Potències: x² → x^{2}, x^n → x^{n}
- Arrels: √x → \\sqrt{x}, √(x+1) → \\sqrt{x+1}
- Integrals: ∫ → \\int, ∫₀^∞ → \\int_0^{\\infty}
- Sumatoris: Σ → \\sum
- Productoris: Π → \\prod
- Límits: lim → \\lim
- Infinit: ∞ → \\infty
- Funcions: sin, cos, tan, log, ln → \\sin, \\cos, \\tan, \\log, \\ln
- Grecs: α→\\alpha, β→\\beta, π→\\pi, θ→\\theta, λ→\\lambda, μ→\\mu
- Vectors: →a → \\vec{a}
- Matrius: usa \\begin{pmatrix}...\\end{pmatrix}
- Equació: = → = (sense canvis)
- Subíndexs: x₁ → x_{1}
- Multiplica: × → \\times, · → \\cdot

RETORNA ÚNICAMENT un JSON vàlid sense cap decoració markdown, amb aquesta forma exacta:
{"isEquation":true,"latex":"E=mc^{2}","confidence":0.97}

Si no hi ha cap expressió matemàtica identifiable:
{"isEquation":false,"latex":"","confidence":0.95}

El camp "confidence" és un float entre 0 i 1 que reflecteix la certesa del reconeixement.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: "Analitza l'escriptura d'aquesta imatge i retorna el JSON sol·licitat.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content.trim();

    // ── 3. Parseja la resposta ────────────────────────────────────────────
    let parsed;
    try {
      const clean = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      // Fallback: intenta extreure JSON amb regex
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = { isEquation: false, latex: '', confidence: 0 };
        }
      } else {
        parsed = { isEquation: false, latex: '', confidence: 0 };
      }
    }

    // Valida l'estructura mínima
    const result = {
      isEquation: Boolean(parsed.isEquation),
      latex: typeof parsed.latex === 'string' ? parsed.latex : '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    };

    // ── 4. Log d'ús (opcional, no bloqueja la resposta) ───────────────────
    const tokensUsed = data.usage?.total_tokens || 0;
    pool
      .query(
        `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used) VALUES ($1, $2, $3, $4)`,
        [req.user.id, req.body.note_id || null, 'math-ocr', tokensUsed]
      )
      .catch((e) => console.warn('Log error (no crític):', e.message));

    pool
      .query(
        `UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1`,
        [req.user.id]
      )
      .catch((e) => console.warn('Increment error (no crític):', e.message));

    res.json(result);
  } catch (err) {
    console.error('math-ocr error:', err.message);
    res.status(500).json({ error: 'Error intern' });
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converteix un array de traços [{x,y}[]] a un SVG blanc sobre fons blanc per
 * enviar-lo a l'API de visió de GPT.
 * Cada traç és un array de punts: [ [{x,y}, {x,y}, ...], [...] ]
 */
function strokesToSVG(strokes) {
  const W = 800;
  const H = 400;

  // Normalitza coordenades al viewport si venen en píxels absoluts grands
  let allX = strokes.flat().map((p) => p.x);
  let allY = strokes.flat().map((p) => p.y);
  const minX = Math.min(...allX, 0);
  const minY = Math.min(...allY, 0);
  const maxX = Math.max(...allX, W);
  const maxY = Math.max(...allY, H);
  const rangeX = maxX - minX || W;
  const rangeY = maxY - minY || H;

  const scale = Math.min(W / rangeX, H / rangeY) * 0.85;
  const offX = (W - rangeX * scale) / 2 - minX * scale;
  const offY = (H - rangeY * scale) / 2 - minY * scale;

  const pathsStr = strokes
    .filter((pts) => pts.length > 0)
    .map((pts) => {
      const d =
        pts
          .map((p, i) => {
            const px = (p.x * scale + offX).toFixed(1);
            const py = (p.y * scale + offY).toFixed(1);
            return i === 0 ? `M${px},${py}` : `L${px},${py}`;
          })
          .join(' ');
      return `<path d="${d}" stroke="#111827" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="white"/>
  ${pathsStr}
</svg>`;
}

/**
 * POST /api/ai/math-segment
 * Body: { imageBase64: string }
 * Returns: { regions: [ { type, content, latex?, bbox: {x,y,w,h} } ] }
 */
const segmentMathOCR = async (req, res) => {
  try {
    const { imageBase64, note_id } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Cal enviar 'imageBase64' en format base64 (string)." });
    }

    const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2500,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Ets un sistema OCR especialitzat en matemàtiques i anàlisi de layout.
La teva tasca és segmentar una imatge (pissarra, paper, llibre) en regions de text i regions d'equacions matemàtiques.

FORMAT DE SORTIDA (JSON OBLIGATORI):
{
  "regions": [
    {
      "type": "equation" | "text",
      "content": "text detectat o descripció breu",
      "latex": "obligatori si type='equation', format LaTeX càlid per KaTeX",
      "bbox": { "x": 0-1000, "y": 0-1000, "w": 0-1000, "h": 0-1000 }
    }
  ]
}

REGLES CRÍTIQUES:
1. Les coordenades bbox (x,y,w,h) són en escala 0-1000 relativa a la imatge total.
2. Si un bloc de text conté una fórmula petita inline, considera si segmentar-la o mantenir-la com a text amb deliminadors $. 
3. Per a fórmules grans o destacades, usa type='equation'.
4. Prioritza equacions. Si dubtes, marca com 'equation'.
5. El camp 'latex' ha de ser robust (fraccions, arrels, integrals, etc.).
6. El JSON no ha de portar decoració markdown.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: "Processa aquesta imatge i extreu totes les regions de text i matemàtiques.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Logs i consum
    const tokensUsed = data.usage?.total_tokens || 0;
    pool.query(
      `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used) VALUES ($1, $2, $3, $4)`,
      [req.user.id, note_id || null, 'math-segment', tokensUsed]
    ).catch(e => console.warn('Usage log fail:', e.message));

    pool.query(
      `UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1`,
      [req.user.id]
    ).catch(e => console.warn('Update user usage fail:', e.message));

    res.json(result);
  } catch (err) {
    console.error('segment-math error:', err);
    res.status(500).json({ error: 'Error intern' });
  }
};

/**
 * POST /api/ai/math-fix
 * Body: { text: string }
 * Returns: { improved: string, equationsFound: number }
 */
const fixMathText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Cal enviar 'text' per processar." });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Ets un editor expert en notes matemàtiques.
La teva tasca és detectar expressions matemàtiques escrites informalment (ex: x^2, sqrt(x), E=mc2) i convertir-les a format LaTeX/KaTeX usant delimitadors $ per a inline o $$ per a blocs.

FORMAT DE SORTIDA (JSON):
{
  "improved": "el text amb les equacions convertides",
  "equationsFound": número_d_equacions
}

REGLES:
1. NO canviis el text que no sigui matemàtic.
2. Usa delimitadors $...$ per a equacions que formin part d'una frase.
3. Usa $$...$$ per a equacions grans o destacades.
4. Converteix fraccions, potències, arrels, integrals, etc. de manera robusta.
5. El text resultant ha de ser vàlid per a un editor de Markdown/Tiptap que usa KaTeX.`,
          },
          {
            role: 'user',
            content: `Converteix les següents notes a format matemàtic net:\n\n${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Logs i consum (OCR mode genèric per a fix)
    const tokensUsed = data.usage?.total_tokens || 0;
    pool.query(
      `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used) VALUES ($1, $2, $3, $4)`,
      [req.user.id, req.body.note_id || null, 'math-fix', tokensUsed]
    ).catch(e => console.warn('Log error:', e.message));
    pool.query(
      'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
      [req.user.id]
    ).catch(e => console.warn('AI counter error:', e.message));

    res.json(result);
  } catch (err) {
    console.error('fix-math error:', err);
    res.status(500).json({ error: 'Error intern' });
  }
};

/**
 * POST /api/ai/table-to-chart
 * Body: { tableMarkdown: string }
 * Returns: { chartType, chartData, reasoning }
 */
const analyzeTable = async (req, res) => {
  try {
    const { tableMarkdown } = req.body;

    if (!tableMarkdown) {
      return res.status(400).json({ error: "Cal enviar 'tableMarkdown'." });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1500,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Ets un expert analista de dades visor de gràfics.
La teva tasca és rebre una taula (Markdown o CSV) i retornar l'estructura JSON necessària per a visualitzar-la amb Chart.js.

FORMAT DE SORTIDA (JSON OBLIGATORI):
{
  "chartType": "bar" | "line" | "pie" | "scatter",
  "chartData": {
    "labels": ["string", ...],
    "datasets": [
      {
        "label": "Títol de la Sèrie",
        "data": [número, ...],
        "backgroundColor": ["rgba(59, 130, 246, 0.5)", ...]
      }
    ]
  },
  "reasoning": "Explicació breu de per què aquest tipus de gràfic és el millor per a aquestes dades."
}

REGLES:
1. Identifica labels (eix X) i valors (eix Y).
2. Tria "bar" per a comparacions, "line" per a tendències temporals, "pie" per a proporcions i "scatter" per a correlacions.
3. Genera colors harmònics i estètics (blue-500, indigo-600, etc en format RGBA).
4. El JSON ha de ser estrictament vàlid.`,
          },
          {
            role: 'user',
            content: `Analitza aquesta taula i prepara la visualització:\n\n${tableMarkdown}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Logs i consum
    const tokensUsed = data.usage?.total_tokens || 0;
    pool.query(
      `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used) VALUES ($1, $2, $3, $4)`,
      [req.user.id, req.body.note_id || null, 'table-to-chart', tokensUsed]
    ).catch(e => console.warn('Log error:', e.message));
    pool.query(
      'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
      [req.user.id]
    ).catch(e => console.warn('AI counter error:', e.message));

    res.json(result);
  } catch (err) {
    console.error('table-to-chart error:', err);
    res.status(500).json({ error: 'Error intern' });
  }
};

/**
 * POST /api/ai/chart-to-table
 * Body: { imageBase64: string }
 * Returns: { chartType, tableMarkdown, data, confidence }
 */
const extractChartData = async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Cal enviar 'imageBase64' en format base64 (string)." });
    }

    const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Ets un extractor de dades de gràfics visuals.
Analitza la imatge del gràfic i extreu-ne la informació.

FORMAT DE SORTIDA (JSON OBLIGATORI):
{
  "chartType": "bar | line | pie | other",
  "tableMarkdown": "| Label | Value |\n|---|---|\n| ... | ... |",
  "data": [
    { "label": "string", "value": número }
  ],
  "confidence": 0-1
}

REGLES:
1. Identifica el tipus de gràfic (barres, línies, pie...).
2. Estima els valors el més precisament possible mirant els eixos o les etiquetes del gràfic.
3. El Markdown ha de ser net i estar ben formatat.
4. Si el gràfic és il·legible o no conté dades, retorna un confidence baix (< 0.3).`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: "Processa aquest gràfic i extreu-ne la taula de dades.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Logs i consum
    const tokensUsed = data.usage?.total_tokens || 0;
    pool.query(
      `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used) VALUES ($1, $2, $3, $4)`,
      [req.user.id, req.body.note_id || null, 'chart-to-table', tokensUsed]
    ).catch(e => console.warn('Log error:', e.message));
    pool.query(
      'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
      [req.user.id]
    ).catch(e => console.warn('AI counter error:', e.message));

    res.json(result);
  } catch (err) {
    console.error('chart-to-table error:', err);
    res.status(500).json({ error: 'Error intern' });
  }
};

/**
 * POST /api/ai/vectorize
 * Body: { points: {x,y}[], canvasWidth, canvasHeight }
 * Returns: { shape, svgElement, properties }
 */
const vectorizeShape = async (req, res) => {
  try {
    const { points, canvasWidth, canvasHeight } = req.body;

    if (!points || points.length < 2) {
      return res.status(400).json({ error: "Cal enviar un conjunt de punts ({x,y}[])." });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Ets un vectoritzador de figures geomètiques dibuixades a mà.
Analitza els punts del traç i detecta la figura idealitzada.

FORMAT DE SORTIDA (JSON OBLIGATORI):
{
  "shape": "circle" | "triangle" | "rectangle" | "line" | "arrow" | "unknown",
  "svgElement": "<svg_tag ... />",
  "properties": { "cx": ..., "cy": ..., "r": ..., "width": ..., "height": ..., "x1": ..., "y1": ..., "x2": ..., "y2": ... }
}

REGLES:
1. Si la confiança és baixa (< 0.6), retorna shape: "unknown" i svgElement: "".
2. Genera un element SVG pur (sense tag <svg> pare), per exemple: <circle cx="10" cy="10" r="5" stroke="white" stroke-width="2" fill="none" />.
3. El color del stroke ha de ser "white" o el color passat en context si n'hi hagués.
4. Calcula el centre i dimensions idealitzades minimitzant l'error quadràtic amb els punts rebuts.`,
          },
          {
            role: 'user',
            content: `Vectoritza aquests punts en un canvas de ${canvasWidth}x${canvasHeight}:\n\n${JSON.stringify(points)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Logs
    pool.query(
      `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used) VALUES ($1, $2, $3, $4)`,
      [req.user.id, null, 'vectorize-shape', data.usage?.total_tokens || 0]
    ).catch(e => console.warn('Log error:', e.message));
    pool.query(
      'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
      [req.user.id]
    ).catch(e => console.warn('AI counter error:', e.message));

    res.json(result);
  } catch (err) {
    console.error('vectorize-shape error:', err);
    res.status(500).json({ error: 'Error intern' });
  }
};

/**
 * POST /api/ai/interpret-diagram
 * Body: { strokes: {points: {x,y}[], timestamp}[], context?, canvasWidth, canvasHeight }
 * Returns: { diagramType, chartConfig?, description? }
 */
const interpretDiagram = async (req, res) => {
  try {
    const { strokes, context, canvasWidth, canvasHeight } = req.body;

    if (!strokes || strokes.length === 0) {
      return res.status(400).json({ error: "Cal enviar almenys un traç." });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1500,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Ets un intèrpret expert en diagrames dibuixats a mà.
Identifica si el dibuix és un diagrama de dades (barres, línies), un circuit o un diagrama de vectors.

FORMAT DE SORTIDA (JSON OBLIGATORI):
{
  "diagramType": "bar" | "line" | "circuit" | "vector" | "unknown",
  "chartConfig": { "type": "...", "data": { "labels": [...], "datasets": [...] } },
  "description": "descripció del circuit o el diagrama si no és de dades"
}

REGLES:
1. Si detectes un gràfic de dades, retorna el chartConfig compatible amb Chart.js estimant els valors dels traços.
2. Si detectes un circuit, descriu els components i les seves connexions al camp description.
3. Si detectes vectors, indica origen, mòdul i sentit aproximats.`,
          },
          {
            role: 'user',
            content: `Interpreta aquest dibuix en un canvas de ${canvasWidth}x${canvasHeight}. Context opcional: ${context || 'cap'}\n\nStrokes: ${JSON.stringify(strokes)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Logs
    pool.query(
      `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used) VALUES ($1, $2, $3, $4)`,
      [req.user.id, null, 'interpret-diagram', data.usage?.total_tokens || 0]
    ).catch(e => console.warn('Log error:', e.message));
    pool.query(
      'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
      [req.user.id]
    ).catch(e => console.warn('AI counter error:', e.message));

    res.json(result);
  } catch (err) {
    console.error('interpret-diagram error:', err);
    res.status(500).json({ error: 'Error intern' });
  }
};

/**
 * POST /api/ai/calibrate
 * Body: { sampleStrokes: {points: {x,y}[], char?}[], canvasWidth, canvasHeight }
 * Returns: { avgCharHeight, avgCharWidth, slantAngle, suggestedFontSize, normalizationMatrix }
 */
const calibrateHandwriting = async (req, res) => {
  try {
    const { sampleStrokes, canvasWidth, canvasHeight } = req.body;

    if (!sampleStrokes || sampleStrokes.length === 0) {
      return res.status(400).json({ error: "Cal enviar mostres de traços per calibrar." });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Ets un calibrador d'escriptura digital.
Analitza les mostres per trobar paràmetres de normalització.

FORMAT DE SORTIDA (JSON OBLIGATORI):
{
  "avgCharHeight": número,
  "avgCharWidth": número,
  "slantAngle": número (graus),
  "suggestedFontSize": número,
  "normalizationMatrix": { "scaleX": ..., "scaleY": ..., "rotation": ... }
}

REGLES:
1. "avgCharHeight" és l'alçada mitjana del traç en píxels.
2. "slantAngle" és la inclinació (0 = vertical).
3. "normalizationMatrix" conté els factors per normalitzar l'escriptura futura a un estàndard uniforme.`,
          },
          {
            role: 'user',
            content: `Calibra aquestes mostres de l'usuari:\n\nCanvas: ${canvasWidth}x${canvasHeight}\nSampleStrokes: ${JSON.stringify(sampleStrokes)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    pool.query(
      `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used) VALUES ($1, $2, $3, $4)`,
      [req.user.id, null, 'calibrate', data.usage?.total_tokens || 0]
    ).catch(e => console.warn('Log error:', e.message));
    pool.query(
      'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
      [req.user.id]
    ).catch(e => console.warn('AI counter error:', e.message));

    res.json(result);
  } catch (err) {
    console.error('calibrate error:', err);
    res.status(500).json({ error: 'Error intern' });
  }
};

/**
 * POST /api/ai/table-assist
 * Body: { instruction, rangeStart?, rangeEnd?, step?, axes? }
 * Returns: { tableMarkdown, rows, cols, headers }
 */
const createTableAssist = async (req, res) => {
  try {
    const { instruction, rangeStart, rangeEnd, step, axes } = req.body;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Ets un assistent de creació de taules per a notes.
Genera una taula Markdown basada en les instruccions de l'usuari.

FORMAT DE SORTIDA (JSON OBLIGATORI):
{
  "tableMarkdown": string,
  "rows": número,
  "cols": número,
  "headers": ["string", ...]
}

REGLES:
1. Si l'usuari dona un step i un range, genera els valors a la primera columna.
2. Si sol demana una divisió (ex: "3x3"), genera una taula buida amb headers genèrics.
3. Utilitza els caps de l'eix (axes) si es proporcionen.`,
          },
          {
            role: 'user',
            content: `Genera una taula amb aquesta configuració:\nInstrucció: ${instruction}\nRange: ${rangeStart} a ${rangeEnd} (step: ${step})\nAxes: ${JSON.stringify(axes)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    pool.query(
      `INSERT INTO ai_usage_logs (user_id, note_id, action, tokens_used) VALUES ($1, $2, $3, $4)`,
      [req.user.id, null, 'table-assist', data.usage?.total_tokens || 0]
    ).catch(e => console.warn('Log error:', e.message));
    pool.query(
      'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
      [req.user.id]
    ).catch(e => console.warn('AI counter error:', e.message));

    res.json(result);
  } catch (err) {
    console.error('table-assist error:', err);
    res.status(500).json({ error: 'Error intern' });
  }
};

module.exports = { 
  mathOCR, 
  segmentMathOCR, 
  fixMathText, 
  analyzeTable, 
  extractChartData, 
  vectorizeShape, 
  interpretDiagram, 
  calibrateHandwriting, 
  createTableAssist 
};
