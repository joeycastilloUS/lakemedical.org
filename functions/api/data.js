// GET /api/data — return cached alumni + triggers data
// In production, reads from KV. For now, returns a redirect to static JSON.

export async function onRequestGet(context) {
  const { env } = context

  // If KV is bound, serve from cache
  if (env.ALUMNI_DATA) {
    const cached = await env.ALUMNI_DATA.get('alumni-data', 'json')
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
  }

  // Fallback: serve static JSON files
  const url = new URL(context.request.url)
  const base = `${url.protocol}//${url.host}`

  const [alumniRes, triggersRes] = await Promise.all([
    fetch(`${base}/data/alumni.json`),
    fetch(`${base}/data/triggers.json`),
  ])

  const alumni = await alumniRes.json()
  const triggers = await triggersRes.json()

  return new Response(JSON.stringify({ alumni, triggers }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
