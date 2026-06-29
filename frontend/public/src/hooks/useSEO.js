import { useEffect } from 'react'

const SITE_URL = 'https://bharathhealthsystems.com'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`
const TWITTER_HANDLE = '@BharatCliniq'

function setMeta(selector, attrKey, attrVal, content) {
  if (!content) return
  let el = document.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrKey, attrVal)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  if (!href) return
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  jsonLd = null,
}) {
  useEffect(() => {
    const prevTitle = document.title
    if (title) document.title = title

    setMeta('meta[name="description"]',   'name',     'description',   description)
    setMeta('meta[name="keywords"]',      'name',     'keywords',      keywords)
    setMeta('meta[name="robots"]',        'name',     'robots',        noindex ? 'noindex,nofollow' : 'index,follow')

    // Open Graph
    setMeta('meta[property="og:title"]',       'property', 'og:title',       title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:image"]',       'property', 'og:image',       ogImage)
    setMeta('meta[property="og:type"]',        'property', 'og:type',        ogType)
    setMeta('meta[property="og:url"]',         'property', 'og:url',         canonical)
    setMeta('meta[property="og:site_name"]',   'property', 'og:site_name',   'BharatCliniq')
    setMeta('meta[property="og:locale"]',      'property', 'og:locale',      'en_IN')

    // Twitter Card
    setMeta('meta[name="twitter:card"]',        'name', 'twitter:card',        'summary_large_image')
    setMeta('meta[name="twitter:site"]',        'name', 'twitter:site',        TWITTER_HANDLE)
    setMeta('meta[name="twitter:title"]',       'name', 'twitter:title',       title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    setMeta('meta[name="twitter:image"]',       'name', 'twitter:image',       ogImage)

    // Canonical
    setLink('canonical', canonical)

    // JSON-LD structured data
    const existingLd = document.querySelector('script[data-seo="json-ld"]')
    if (existingLd) existingLd.remove()
    if (jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-seo', 'json-ld')
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }

    return () => { document.title = prevTitle }
  }, [title, description, keywords, canonical, ogImage, ogType, noindex])
}
