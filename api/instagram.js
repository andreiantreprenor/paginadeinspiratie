const IG_ID = process.env.INSTAGRAM_BUSINESS_ID;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const BASE = 'https://graph.facebook.com/v25.0';

async function waitUntilReady(containerId) {
  let status = 'IN_PROGRESS';
  let attempts = 0;
  while (status !== 'FINISHED' && attempts < 10) {
    await new Promise(r => setTimeout(r, 2000));
    const check = await fetch(`${BASE}/${containerId}?fields=status_code&access_token=${TOKEN}`).then(r => r.json());
    status = check.status_code;
    attempts++;
    if (status === 'ERROR') throw new Error('Container processing failed (status ERROR)');
  }
  if (status !== 'FINISHED') throw new Error('Container nu s-a procesat la timp (timeout)');
}

// Postare imagine pe Instagram Feed
async function postInstagramFeed(imageUrl, caption) {
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

  await waitUntilReady(container.id);

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
      media_type: 'STORIES',
      access_token: TOKEN,
    }),
  }).then(r => r.json());

  if (container.error) throw new Error('Story container: ' + container.error.message);

  await waitUntilReady(container.id);

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
      results.instagram = await postInstagramFeed(imageUrl, caption);
      results.facebook = await postFacebookPage(imageUrl, caption);
    }

    if (type === 'morning_story' || type === 'afternoon_story') {
      results.story = await postInstagramStory(storyImageUrl || imageUrl);
    }

    res.status(200).json({ success: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
