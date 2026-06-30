import { list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { blobs } = await list({ prefix: 'today.json' });
    if (!blobs || blobs.length === 0) {
      return res.status(404).json({ error: 'No cached content yet' });
    }

    const blob = blobs[0];
    const response = await fetch(blob.url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (err) {
    console.error('Today fetch error:', err);
    res.status(500).json({ error: err.message });
  }
}
