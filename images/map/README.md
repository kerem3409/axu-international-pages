# Aegean destination map

Coastline and islands: Natural Earth 1:10m land, pinned v5.1.2, public domain.
Source: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_land.geojson
Dataset: https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/
License: https://www.naturalearthdata.com/about/terms-of-use/

`aegean-land.geojson` is the geographic subset clipped to the bounds in `sources.json`. `aegean.svg` projects the subset to Mercator, north up. Markers use longitude/latitude, independently of text offsets. Sources and coordinates for each marker are recorded in `sources.json`; leader lines connect displaced labels to their true points. No travel routes, durations or distances are represented. This is a regional destination overview, not a navigation chart.

To reproduce: download the pinned source to `images/map/land.source.geojson`, install `polygon-clipping` in the ignored `.tools` directory, and run `node scripts/build-aegean-map.mjs`. The original worldwide input is excluded from Git and publication; the clipped source is retained for inspection.
