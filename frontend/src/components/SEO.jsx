import { useEffect } from 'react';

const SITE_URL = 'https://acrovix.com';
const DEFAULT_TITLE = 'ACROVIX — Technology, Cybersecurity & Infrastructure Solutions';
const DEFAULT_DESCRIPTION =
  'ACROVIX INNOVATIONS PRIVATE LIMITED — Enterprise technology, cybersecurity, infrastructure and digital solutions designed to help organizations scale securely and efficiently.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

/**
 * Creates (or reuses) a <meta> tag identified by attrName="attrValue"
 * and sets its content.
 */
function upsertMeta(attrName, attrValue, content) {
  if (content === undefined || content === null || content === '') return;
  let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href) {
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

function upsertJsonLd(id, data) {
  let tag = document.getElementById(id);
  if (!data) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

/**
 * SEO component — drop into any page to control per-page metadata.
 *
 * Props:
 *  - title:        Page title (auto-suffixed with "| ACROVIX")
 *  - description:  Meta description (~150-160 chars ideal)
 *  - path:         Route path (e.g. "/services/enterprise-it") used to build the canonical URL.
 *                   Falls back to the current browser location if omitted.
 *  - image:         Absolute URL for social share image. Falls back to the default OG image.
 *  - noindex:       Set true to keep a page out of search results (e.g. thank-you pages).
 *  - structuredData: A JSON-LD object (or array of objects) to inject for rich results.
 *  - keywords:      Optional comma-separated keywords string.
 */
const SEO = ({
  title,
  description,
  path,
  image,
  noindex = false,
  structuredData,
  keywords
}) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ACROVIX` : DEFAULT_TITLE;
    const metaDescription = description || DEFAULT_DESCRIPTION;
    const canonicalPath = path || window.location.pathname;
    const canonicalUrl = `${SITE_URL}${canonicalPath === '/' ? '' : canonicalPath}`.replace(/\/+$/, '') || SITE_URL;
    const ogImage = image || DEFAULT_IMAGE;

    document.title = fullTitle;

    upsertMeta('name', 'description', metaDescription);
    if (keywords) upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertCanonical(canonicalUrl);

    // Open Graph
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', metaDescription);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'ACROVIX');
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:locale', 'en_IN');

    // Twitter Card
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', metaDescription);
    upsertMeta('name', 'twitter:image', ogImage);

    // JSON-LD structured data (page-specific, e.g. Service / BreadcrumbList / FAQPage)
    upsertJsonLd('page-structured-data', structuredData || null);

    return () => {
      // Structured data is page-specific — clear it on unmount so the next
      // page doesn't inherit stale schema before its own SEO effect runs.
      upsertJsonLd('page-structured-data', null);
    };
  }, [title, description, path, image, noindex, structuredData, keywords]);

  return null;
};

export default SEO;
