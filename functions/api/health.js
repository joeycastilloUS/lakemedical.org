// GET /api/health — health check for monitoring + scheduler verification

export async function onRequestGet(context) {
  const { env } = context
  const kvBound = !!env.ALUMNI_DATA
  let kvStatus = 'not_bound'
  let recordCount = 0
  let lastRefresh = null

  if (kvBound) {
    try {
      const cached = await env.ALUMNI_DATA.get('alumni-data', 'json')
      if (cached) {
        recordCount = cached.alumni?.length || 0
        lastRefresh = cached.lastRefresh || null
      }
      kvStatus = 'connected'
    } catch (e) {
      kvStatus = 'error'
    }
  }

  const cursor = kvBound ? await env.ALUMNI_DATA.get('refresh-cursor') : null

  return new Response(JSON.stringify({
    status: 'ok',
    service: 'alumni-artifacts',
    kv: kvStatus,
    records: recordCount,
    lastRefresh,
    refreshInProgress: cursor !== null,
    refreshCursor: cursor ? parseInt(cursor) : null,
    timestamp: new Date().toISOString(),
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
