// Run after downloading the pinned Natural Earth source documented in images/map/README.md.
import fs from 'node:fs';
import crypto from 'node:crypto';
import polygonClipping from '../.tools/node_modules/polygon-clipping/dist/polygon-clipping.esm.js';
const source = fs.readFileSync('images/map/land.source.geojson');
const data = JSON.parse(source);
const bounds = [24.5,36.8,30.5,41.7];
const [west,south,east,north] = bounds;
const box = [[[west,south],[east,south],[east,north],[west,north],[west,south]]];
const polygons = data.features.flatMap(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates]);
const local = polygons.filter(p=>p[0].some(([x,y])=>x>=west&&x<=east&&y>=south&&y<=north));
const clipped = polygonClipping.intersection(local,box);
fs.writeFileSync('images/map/aegean-land.geojson',JSON.stringify({type:'MultiPolygon',coordinates:clipped})+'\n');
const mercator = lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
const scale=600/((east-west)*Math.PI/180),height=(mercator(north)-mercator(south))*scale;
const point=([lon,lat])=>[(lon-west)*Math.PI/180*scale,(mercator(north)-mercator(lat))*scale];
const paths=clipped.map(p=>p.map(r=>r.map((c,i)=>`${i?'L':'M'}${point(c).map(n=>n.toFixed(2)).join(',')}`).join('')+'Z').join('')).join('');
// Coordinates are geographic points; label offsets only move text, never the markers.
const places=[['Istanbul',28.9784,41.0082,14,-12],['Pergamon',27.1842,39.1325,14,-12],['Ephesus',27.3411,37.9390,-34,-25],['Kusadasi',27.2567,37.8579,-30,32],['Sirince',27.4333,37.9436,33,-4],['Pamukkale',29.1233,37.9200,-10,35]];
const labels=places.map(([name,lon,lat,dx,dy])=>{const [x,y]=point([lon,lat]);return `<g><path d="M${x},${y}l${dx},${dy}" stroke="#46686b" stroke-width="1"/><circle cx="${x}" cy="${y}" r="4" fill="#173f49" stroke="#fff" stroke-width="1.5"/><text x="${x+dx+(dx<0?-4:4)}" y="${y+dy}" text-anchor="${dx<0?'end':'start'}">${name}</text></g>`;}).join('');
fs.writeFileSync('images/map/aegean.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 ${height.toFixed(2)}" role="img" aria-labelledby="title desc"><title id="title">Aegean destinations in western Türkiye</title><desc id="desc">Geographic coastline and islands, with Istanbul, Pergamon, Ephesus, Kusadasi, Sirince and Pamukkale at their longitude and latitude. North is up. No routes are shown.</desc><rect width="600" height="100%" fill="#d3e2e2"/><path d="${paths}" fill="#efe9d9" stroke="#b4bdad" stroke-width=".7" fill-rule="evenodd"/><g fill="#173f49" font-family="Georgia,serif" font-size="26" paint-order="stroke" stroke="#f5f2e9" stroke-width="3" stroke-linejoin="round">${labels}</g><text x="35" y="325" fill="#536f76" font-family="Georgia,serif" font-size="19" font-style="italic" letter-spacing="2">AEGEAN SEA</text><text x="412" y="285" fill="#8a795a" font-family="Georgia,serif" font-size="21" letter-spacing="3">TÜRKİYE</text></svg>\n`);
fs.writeFileSync('images/map/sources.json',JSON.stringify({dataset:'Natural Earth 1:10m land',version:'5.1.2',license:'Public domain',sourceUrl:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_land.geojson',licenseUrl:'https://www.naturalearthdata.com/about/terms-of-use/',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),bounds,projection:'Mercator, north up',places:places.map(([name,longitude,latitude])=>({name,longitude,latitude,sourceUrl:`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`}))},null,2)+'\n');
