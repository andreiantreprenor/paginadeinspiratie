export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { subject, desc, format } = req.body;
  // format: 'square' (1080x1080) sau 'story' (1080x1920)

  const isStory = format === 'story';
  const size = isStory ? '1024x1792' : '1024x1024';

  const prompt = isStory
    ? `Minimalist inspirational background for a story about ${subject}. ${desc}. 
       Light, airy, elegant aesthetic. Soft pastel gradients, warm whites and creams. 
       Abstract or symbolic representation. No text. Portrait orientation. 
       Premium, sophisticated, modern design. Subtle bokeh or texture.`
    : `Minimalist inspirational image representing ${subject}. ${desc}. 
       Light background, elegant and sophisticated. Soft colors, warm tones. 
       Abstract or symbolic. No text. Square format. 
       Premium modern aesthetic, subtle and refined.`;

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard',
        response_format: 'url',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    res.status(200).json({ url: data.data[0].url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
