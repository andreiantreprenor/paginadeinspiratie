const CATEGORIES = [
  'sport și mentalitate de campion','filosofie și stoicism',
  'antreprenoriat și inovație','leadership și viziune',
  'artă și creativitate','știință și descoperire',
  'reziliență și depășirea adversității','psihologie și comportament uman',
  'spiritualitate și sens','finanțe și libertate financiară',
  'natură și explorare','literatură și poveste',
  'muzică și expresie','medicină și longevitate',
  'diplomație și putere','educație și cunoaștere',
  'arhitectură și design','film și vizualitate',
  'matematică și logică','activism și schimbare socială',
];

function pickCategory() {
  const d = new Date();
  const seed = d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate();
  return CATEGORIES[seed % CATEGORIES.length];
}

function buildCaption(quote, author, source, type) {
  const hashtags = `\n\n#inspiratie #citate #motivatie #dezvoltarepersonala #carti #citatedezilei #romania #succes #mindset #paginadeinspiratie`;

  if (type === 'morning') {
    return `🌅 Bună dimineața!\n\n"${quote}"\n\n— ${author}${source ? `, ${source}` : ''}\n\n💡 Începe ziua cu inspirație de la paginadeinspiratie.ro${hashtags}`;
  } else {
    return `🌙 Seara bună!\n\n"${quote}"\n\n— ${author}${source ? `, ${source}` : ''}\n\n✨ Închei ziua cu gândul la: paginadeinspiratie.ro${hashtags}`;
  }
}

export default async function handler(req, res) {
  // Vercel Cron trimite mereu GET, niciodată POST
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Vercel Cron trimite secretul automat ca "Authorization: Bearer <CRON_SECRET>", nu ca "x-cron-secret"
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET nu are body -> tipul postării se deduce din ora UTC curentă, conform vercel.json (6, 8, 13, 18 UTC)
  const utcHour = new Date().getUTCHours();
  const typeByHour = {
    6: 'morning_post',
    8: 'morning_story',
    13: 'afternoon_story',
    18: 'evening_post',
  };
  const type = typeByHour[utcHour];

  if (!type) {
    return res.status(200).json({ skipped: true, reason: `Ora UTC ${utcHour} nu corespunde niciunui slot programat` });
  }

  const baseUrl = `https://paginadeinspiratie.ro`;

  try {
    // 1. Generează subiect și citate (salvează în cache doar pentru morning_post)
    const generateRes = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cat: pickCategory(),
        recent: [],
        saveToCache: type === 'morning_post',
      }),
    });
    const { subject, desc, quotes, cat } = await generateRes.json();

    if (!quotes || quotes.length === 0) throw new Error('No quotes generated');

    // 2. Alege citatul în funcție de tipul postării
    const quoteIndex = {
      morning_post: 0,
      morning_story: 1,
      afternoon_story: 2,
      evening_post: 3,
    }[type] || 0;

    const quote = quotes[quoteIndex] || quotes[0];

    // 3. Generează imagine
    const isStory = type === 'morning_story' || type === 'afternoon_story';
    const imageRes = await fetch(`${baseUrl}/api/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        desc,
        format: isStory ? 'story' : 'square',
      }),
    });
    const { url: imageUrl } = await imageRes.json();

    // 4. Construiește caption
    const isEvening = type === 'evening_post';
    const caption = buildCaption(quote.text, subject, quote.source, isEvening ? 'evening' : 'morning');

    // 5. Postează pe Instagram/Facebook
    const postRes = await fetch(`${baseUrl}/api/instagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, imageUrl, caption }),
    });
    const postResult = await postRes.json();

    res.status(200).json({
      success: true,
      type,
      subject,
      quote: quote.text,
      imageUrl,
      postResult,
    });

  } catch (err) {
    console.error('Cron error:', err);
    res.status(500).json({ error: err.message });
  }
}
