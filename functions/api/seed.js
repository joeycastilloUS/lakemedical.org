// POST /api/seed — load static JSON data into KV for the first time
// Run once after KV namespace is created and bound.

export async function onRequestPost(context) {
  const { env } = context

  // Auth check
  const authHeader = context.request.headers.get('Authorization')
  const expected = env.REFRESH_SECRET
  if (expected && authHeader !== `Bearer ${expected}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!env.ALUMNI_DATA) {
    return new Response(JSON.stringify({ error: 'KV not bound' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch static JSON from the same origin
  const url = new URL(context.request.url)
  const base = `${url.protocol}//${url.host}`

  const [alumniRes, triggersRes] = await Promise.all([
    fetch(`${base}/data/alumni.json`),
    fetch(`${base}/data/triggers.json`),
  ])

  if (!alumniRes.ok || !triggersRes.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch static data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const alumni = await alumniRes.json()
  const triggers = await triggersRes.json()

  // Write to KV
  await env.ALUMNI_DATA.put('alumni-data', JSON.stringify({
    alumni,
    triggers,
    lastRefresh: new Date().toISOString(),
    seeded: true,
  }))

  return new Response(JSON.stringify({
    status: 'ok',
    message: `Seeded ${alumni.length} alumni + ${triggers.length} triggers into KV`,
    timestamp: new Date().toISOString(),
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
