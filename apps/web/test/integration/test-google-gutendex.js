// Simple integration test for Google Books proxy and Gutendex fallback
// Usage: run the dev server (localhost:3000) then: node test-google-gutendex.js

const assert = require('assert')
const fetch = global.fetch || require('node-fetch')

async function run() {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  console.log('Running tests against', base)

  // Test Google proxy: use a known Google volume ID (example id may vary)
  const sampleGoogleId = 'zyTCAlFPjgYC' // example from Google Books docs
  try {
    const res = await fetch(`${base}/api/books/google/${sampleGoogleId}`)
    console.log('/api/books/google status', res.status)
    assert(res.ok, 'Google proxy returned non-OK')
    const json = await res.json()
    console.log('google payload keys:', Object.keys(json))
    assert(json.id, 'no id in google payload')
    console.log('Google proxy test passed')
  } catch (e) {
    console.error('Google proxy test failed:', e.message)
  }

  // Test main endpoint enrichment and Gutendex fallback by searching a public-domain title
  const publicTitle = 'Pride and Prejudice'
  try {
    // URL-encode a search-esque id — here we call via OpenLibrary path so the server will enrich
    const res2 = await fetch(`${base}/api/books/${encodeURIComponent(publicTitle)}`)
    console.log('/api/books/:id status', res2.status)
    assert(res2.ok, 'books detail endpoint returned non-OK')
    const j2 = await res2.json()
    console.log('detail payload keys:', Object.keys(j2))
    if (j2.bodyHtml) {
      console.log('Detail endpoint returned bodyHtml (enriched) — length', String(j2.bodyHtml).length)
    } else {
      console.log('Detail endpoint did not return bodyHtml; enrichment may be unavailable in this environment')
    }
    console.log('Enrichment test finished')
  } catch (e) {
    console.error('Enrichment test failed:', e.message)
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
