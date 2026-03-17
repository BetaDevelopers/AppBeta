const improveText = async (text) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ets un assistent que millora apunts d\'estudiants. Estructura el text amb títols markdown (#, ##), llistes (- item) i paràgrafs clars. Corregeix l\'ortografia. Respon SEMPRE en la mateixa llengua que el text d\'entrada.'
        },
        {
          role: 'user',
          content: text
        }
      ],
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.choices[0].message.content;
};

const summarizeText = async (text) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ets un assistent que resumeix apunts. Crea un resum concís amb els punts clau en format de llista markdown. Màxim 150 paraules. Respon SEMPRE en la mateixa llengua que el text d\'entrada.'
        },
        {
          role: 'user',
          content: text
        }
      ],
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.choices[0].message.content;
};

module.exports = {
  improveText,
  summarizeText,
};
