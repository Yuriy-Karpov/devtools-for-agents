---
name: devtools-seo
description: Audit the technical SEO of a live rendered Chromium page through the bundled Chrome DevTools MCP. Use for indexability concerns, title and metadata, canonical and robots directives, structured data, headings, crawlable links and content, document status, redirects, Lighthouse SEO findings, and desktop/mobile rendered-state comparisons. Do not trigger for ranking strategy, keyword research, or a generic UI bug.
---

# DevTools SEO

Audit the rendered page through the MCP server named `devtools`. Treat the sibling
`devtools` skill as the connection, navigation, snapshot, Network, Console, and
safety contract; do not repeat its setup instructions.

## Scope and inputs

Record the requested URL, final URL, public or authenticated state, page state,
desktop/mobile and viewport, and whether the scope is one page, a named set of
pages, or a user flow. Do not silently substitute a public page for an inaccessible
authenticated target.

Treat page-level and site-level audits separately. Do not imply that one rendered
page covers site-wide robots, sitemap, crawl paths, or internal linking.

## Workflow

1. Open the relevant state and capture a fresh snapshot. Record the final URL,
   main-document status, and observed redirect chain.
2. Run `lighthouse_audit` with an explicit device and mode. Use `navigation` to
   reload and audit the URL; use `snapshot` for the current SPA or post-interaction
   state.
3. Inspect failed SEO audits by audit ID. Do not stop at the category score.
4. Verify the rendered document with snapshot and, when needed,
   `evaluate_script`: title, meta description, canonical, robots directives,
   `lang`, heading structure, link destinations, image alternatives, and
   structured data.
5. Use Network and Console evidence to investigate document status, redirects,
   blocked resources, rendering failures, and differences between the initial
   response and client-rendered state.
6. Relate each finding to crawlability, indexability, content understanding, or
   search-result presentation. Keep accessibility impact in
   `devtools-accessibility` when both skills are used.

## Interpretation rules

- Treat Lighthouse as a source of signals, not the final conclusion.
- Do not interpret a Lighthouse SEO score as a ranking forecast.
- Do not claim that a declared canonical will be selected by a search engine.
- Do not claim that valid structured data guarantees a rich result.
- Do not assume an authenticated or personalized state represents crawler-visible
  content without additional evidence.
- Do not generalize one page to the whole site.
- Label an unverified cause as a hypothesis and name the next check.
- Assign severity from impact on the scoped page or flow, not from score alone.

## Result format

Return:

1. **Scope** — requested/final URL, state, device, viewport, Lighthouse mode, and
   page/site boundaries.
2. **Summary** — the principal technical SEO risks without ranking promises.
3. **Findings** — ordered by `critical`, `high`, `medium`, `low`, or `info`.
4. **Evidence** — audit ID, DOM value, directive, response status, redirect,
   request, or reproduction step.
5. **Recommendations** — a concrete correction and method to re-audit it.
6. **Limitations** — site-level checks not performed, inaccessible states,
   Lighthouse failure, or initial-response data not verified.

For each finding state observation, search impact, evidence, confidence (`high`,
`medium`, or `low`), recommendation, and verification. Use `critical` only when a
key scoped page or its content is effectively unavailable to the intended crawler.

## Stop and degrade safely

If Lighthouse fails, preserve manual DOM and Network findings and mark the audit
partial. Return a partial report rather than inventing results when the page,
authorization, initial response, or required tools are unavailable. Name completed
checks, the exact limitation, and the smallest next step. Complete the audit only
after reporting the final URL, device/mode, concrete failed audits, verified
document signals, and unperformed site-level checks.

