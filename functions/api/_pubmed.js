// PubMed (NCBI E-Utilities) API — Worker-compatible module
// Free, no auth for <3 req/sec
// Docs: https://www.ncbi.nlm.nih.gov/books/NBK25500/

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

export async function searchPubMed({ authorName, maxResults = 10 }) {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: `${authorName}[Author]`,
    retmax: String(maxResults),
    retmode: 'json',
  })

  const res = await fetch(`${EUTILS_BASE}/esearch.fcgi?${params}`)
  if (!res.ok) throw new Error(`PubMed search ${res.status}`)
  const data = await res.json()
  return {
    ids: data.esearchresult?.idlist || [],
    count: parseInt(data.esearchresult?.count || '0'),
  }
}

export async function fetchArticles(pmids) {
  if (!pmids?.length) return []
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
  })

  const res = await fetch(`${EUTILS_BASE}/esummary.fcgi?${params}`)
  if (!res.ok) throw new Error(`PubMed fetch ${res.status}`)
  const data = await res.json()
  const result = data.result || {}

  return pmids.filter(id => result[id]).map(id => {
    const a = result[id]
    return {
      pmid: id,
      title: a.title || '',
      authors: (a.authors || []).map(x => x.name).join(', '),
      journal: a.fulljournalname || a.source || '',
      pubDate: a.pubdate || '',
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    }
  })
}

export async function searchAlumniPublications({ firstName, lastName, maxResults = 5 }) {
  const query = `${lastName} ${firstName?.charAt(0) || ''}`
  const { ids, count } = await searchPubMed({ authorName: query, maxResults })
  const articles = ids.length > 0 ? await fetchArticles(ids) : []
  return { articles, totalCount: count, searchQuery: query }
}

export function pubmedToEnrichment(publications) {
  if (!publications?.length) return { touchpoints: [], notables: [] }
  return {
    touchpoints: publications.map(pub => ({
      date: parsePubMedDate(pub.pubDate),
      type: 'signal', icon: '📄',
      title: `Publication: ${pub.title}`,
      detail: `${pub.journal} (${pub.pubDate}). ${pub.authors}.`,
      added_by: 'system', source: 'pubmed',
    })),
    notables: [`Published ${publications.length} peer-reviewed paper${publications.length > 1 ? 's' : ''} (PubMed)`],
  }
}

function parsePubMedDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  const months = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' }
  const parts = dateStr.split(' ')
  return `${parts[0] || new Date().getFullYear()}-${months[parts[1]] || '01'}-${parts[2]?.padStart(2,'0') || '01'}`
}
