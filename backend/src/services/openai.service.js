require('dotenv').config();

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

async function callOpenAI(systemPrompt, userText) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userText },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Error OpenAI API');
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function improveText(text) {
  return callOpenAI(
    `Ets un assistent expert en organitzar apunts d'estudiants.
     Millora el text seguint aquestes regles:
     1. Corregeix ortografia i gramàtica
     2. Estructura amb títols markdown (# Títol, ## Subtítol)
     3. Crea llistes amb punts (- element) quan sigui adequat
     4. Afegeix negretes (**text**) per paraules clau
     5. Separa en paràgrafs clars
     Respon SEMPRE en la mateixa llengua que el text d'entrada.
     Retorna NOMÉS el text millorat, sense explicacions.`,
    text
  );
}

async function summarizeText(text) {
  return callOpenAI(
    `Ets un assistent que resumeix apunts d'estudiants.
     Crea un resum estructurat seguint aquest format:
     ## Resum
     [2-3 frases explicant el tema principal]
     
     ## Punts clau
     - [punt important 1]
     - [punt important 2]
     - [punt important 3]
     (màxim 5 punts)
     
     Respon SEMPRE en la mateixa llengua que el text d'entrada.
     Sigues concís: màxim 150 paraules en total.`,
    text
  );
}

async function suggestSubject(text) {
  return callOpenAI(
    `Analitza el text i retorna ÚNICAMENT el nom de l'assignatura acadèmica
     més probable (una sola paraula o nom curt, sense explicació).
     Exemples vàlids: Matemàtiques, Biologia, Història, Física, Química,
     Llengua, Economia, Informàtica, Filosofia, Anglès.
     Respon en la mateixa llengua que el text.`,
    text.substring(0, 500)
  );
}

/**
 * chatWithHistory — conversa multi-torn amb historial complet.
 * @param {string} systemPrompt - instruccions del sistema (inclou el context de notes)
 * @param {Array<{role: string, content: string}>} messages - historial de la conversa
 */
async function chatWithHistory(systemPrompt, messages) {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Error OpenAI API');
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

module.exports = { improveText, summarizeText, suggestSubject, chatWithHistory };
