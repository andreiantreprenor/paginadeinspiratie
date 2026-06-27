export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { cat, recent } = req.body;
  const today = new Date().toLocaleDateString('ro-RO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const recentStr = recent?.length > 0
    ? `\nSubiecte folosite recent (evită-le): ${recent.slice(0, 30).join(', ')}`
    : '';

  const prompt = `Azi este ${today}. Categoria zilei: "${cat}".${recentStr}

Alege o personalitate celebră, carte, sau concept iconic din această categorie care NU apare în lista de evitat. Poate fi din orice epocă sau cultură — fii creativ și variat.

Răspunde EXCLUSIV cu JSON valid (fără markdown, fără text extra):
{
  "subject": "Numele complet",
  "cat": "${cat}",
  "desc": "1-2 propoziții despre cine este sau ce reprezintă (max 160 caractere, în română)",
  "bookTitle": "Titlul celei mai cunoscute cărți a subiectului (sau null dacă nu există)",
  "quotes": [
    {"text": "citatul în română (tradus dacă e necesar, natural și puternic)", "source": "titlul exact al cărții"}
  ]
}

Reguli stricte:
- Exact 15 citate extrase EXCLUSIV din cărți publicate (biografie, autobiografie, eseuri, interviuri publicate în volum)
- INTERZIS: forumuri, Reddit, Twitter, interviuri TV/radio, discursuri, citate atribuite informal
- Fiecare citat să aibă o carte sau volum publicat ca sursă
- Citatele să fie variate ca lungime și ton
- Traduse natural în română (nu literal)
- source = titlul exact al cărții
- DOAR JSON valid, nimic altceva`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const raw = data.content.map(b => b.text || '').join('');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]);

    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
