---
name: New plugin proposal
about: Propose a new data source/module before writing the code
title: "[Plugin] "
labels: enhancement, new-plugin
assignees: ''
---

<!-- File this before opening a PR — it lets a maintainer catch scope or
     sensitivity issues before you've written the plugin, not during
     review. See docs/PLUGIN_DEVELOPMENT.md for how plugins are built and
     CONTRIBUTING.md for the review checklist this feeds into. -->

## Plugin

- **Proposed id:** (folder name under `plugins/`, e.g. `whois-lookup`)
- **Category:** identity / media / geolocation / network / social / documents
- **Data source:** (which API/service, and a link to its docs)
- **Requires an API key?** yes/no

## Input / output

- **Input:** what does a user provide (e.g. a domain, a BSSID, a username)?
- **Output:** what does `run()` return in `data`?

## Sensitivity assessment

- **`sensitiveData`:** true/false — does this return personal data,
  location data, or anything beyond a public existence/lookup check?
- **`requiresConsent`:** true/false — should this normally match
  `sensitiveData`
- If either is `true`: this will go through the stricter review path in
  [CONTRIBUTING.md](../../CONTRIBUTING.md) and be merged only with direct
  maintainer review.

## Scope check

- [ ] This pulls only from the data source's declared, public/legitimate
      API — not scraping around auth or rate-limit walls
- [ ] This is not primarily useful for tracking, deanonymizing, or
      surveilling a specific individual without their knowledge (see
      [docs/ETHICS.md](../../docs/ETHICS.md))
- [ ] I've checked the data source's terms of service for rate limits or
      usage restrictions this plugin needs to respect
