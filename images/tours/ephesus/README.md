# Ephesus photo installation — pending

On 2026-10-12 the five specified Commons file pages and the selected CC license deeds were checked through web access. All five permit commercial use. Credits, original URLs, adaptation and attribution requirements are recorded in `sources.json`.

Direct Wikimedia downloads failed with connection errors / EACCES. GitHub API access also failed. No JPG or WebP was downloaded, `catalogue.json` remains unchanged, and the five placeholders remain. No photo deployment is claimed.

`scripts/install-ephesus-photos.ps1` rechecks file-page authors and licenses before downloading. It stages all five originals, preserves original URLs and SHA-256 hashes, creates JPEGs at up to 1920px wide / quality 86 without cropping or upscaling, and installs only after all downloads and decodes succeed. It preserves all tour content and only updates the first tour's gallery. Original downloads and file-page HTML snapshots remain in the reported temporary staging directory. Archive that directory separately if original binaries must be retained long-term. WebP generation is not included because no encoder was available locally.

Photo Credits appears below Related Tours only when installed gallery images have credits. It includes title, author, Commons link, CC license, modification description, and BY-SA adaptation terms. Existing gallery CSS and behavior are preserved.

From the GitHub Pages repository, after network access is restored:

1. Run `scripts/install-ephesus-photos.ps1` in a PowerShell session that permits scripts.
2. Run `node scripts/verify-ephesus-photos.mjs --require-images` (requires the existing parent site's happy-dom dependency).
3. Run the existing static and responsive browser checks from `../scripts/` and visually inspect the real images.
4. Commit the downloaded assets and catalogue update, then push `main` using the existing GitHub Pages flow.
5. Verify all five live image URLs and the credits on the live tour page.

The installer has not completed an actual download/optimization run. Local tests passed for JSON/content preservation, existing responsive layout at 1440/820/390/320px, arrows, swipe, Escape/focus, and image-error fallback. Credits and real-image markup were tested with in-memory fixture data; real image file, optimization and deployment checks remain blocked.
