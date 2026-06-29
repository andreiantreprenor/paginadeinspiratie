const IG_ID = process.env.INSTAGRAM_BUSINESS_ID;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const BASE = 'https://graph.facebook.com/v25.0';

// Postare imagine pe Instagram Feed
async function postInstagramFeed(imageUrl, caption) {
  // Pas 1: Creează container media
  const container = await fetch(`${BASE}/${IG_ID}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: TOKEN,
    }),
  }).then(r => r.json());

  if (container.error) throw new Error('IG container: ' + container.error.message);

  // Pas 2: Publică
  const publish = await fetch(`${BASE}/${IG_ID}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: TOKEN,
    }),
  }).then(r => r.json());

  if (publish.error) throw new Error('IG publish: ' + publish.error.message);
  return publish.id;
}

// Postare Story pe Instagram
async function postInstagramStory(imageUrl) {
  const container = await fetch(`${BASE}/${IG_ID}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      media_type: 'IMAGE',
      is_carousel_item: false,
      access_token: TOKEN,
    }),
  }).then(r => r.json());

  if (container.error) throw new Error('Story container: ' + container.error.message);

  const publish = await fetch(`${BASE}/${IG_ID}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: TOKEN,
    }),
  }).then(r => r.json());

  if (publish.error) throw new Error('Story publish: ' + publish.error.message);
  return publish.id;
}

// Postare pe Facebook Page
async function postFacebookPage(imageUrl, caption) {
  const post = await fetch(`${BASE}/${PAGE_ID}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: imageUrl,
      caption,
      access_token: TOKEN,
    }),
  }).then(r => r.json());

  if (post.error) throw new Error('FB post: ' + post.error.message);
  return post.id;
}

// Handler principal
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, imageUrl, caption, storyImageUrl } = req.body;
  // type: 'morning_post', 'morning_story', 'afternoon_story', 'evening_post'

  try {
    const results = {};

    if (type === 'morning_post' || type === 'evening_post') {
      // Post feed Instagram + Facebook
      results.instagram = await postInstagramFeed(imageUrl, caption);
      results.facebook = await postFacebookPage(imageUrl, caption);
    }

    if (type === 'morning_story' || type === 'afternoon_story') {
      // Story Instagram
      results.story = await postInstagramStory(storyImageUrl || imageUrl);
    }

    res.status(200).json({ success: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
