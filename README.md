# AXU International visitor test

Static visitor assets for eleven tours. Quote forms prepare a WhatsApp message for the customer to send; requests are not stored by this website. Search indexing is disabled by HTML metadata and robots.txt.

GitHub Pages is deployed by `.github/workflows/pages.yml` on every push to `main` or manual workflow run. `scripts/build-pages.mjs` copies visitor assets to `_site` and generates `version.json` at build time. The footer on all pages reads that file independently of tour loading.

Versions use `1.0.<Git commit count>+<7-character commit SHA>`. The update date uses the Europe/Istanbul timezone. Full Git history is checked out so the commit count remains consistent. Generated files are excluded from Git; individual page HTML files do not need release edits.

`catalogue.json` is the publication source. The two Istanbul flight packages use `enquiryVariant` to enable Individual Traveller / Travel Agency enquiries, optional agency names and a preferred start date. Other tour forms retain their existing fields and message format. `pairedTourId` and `pairedTourText` provide reciprocal links below each introduction and beside its form.

Checks: `node scripts/verify-istanbul-packages.mjs`, `node scripts/verify-whatsapp-quotes.mjs`, `node scripts/verify-whatsapp-browser.mjs`, and `node scripts/verify-removed-tour.mjs`. WhatsApp handoffs are intercepted in functional tests; no messages are sent. New package photographs are local files, with attribution in the catalogue and `images/tours/pamukkale/sources.json`.
