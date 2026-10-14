import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const git = (...args) => execFileSync('git', args, {cwd:root, encoding:'utf8'}).trim();
const sha = git('rev-parse', 'HEAD');
const count = git('rev-list', '--count', 'HEAD');
const updated = new Intl.DateTimeFormat('en-GB', {
 timeZone:'Europe/Istanbul', day:'2-digit', month:'2-digit', year:'numeric'
}).format(new Date()).replaceAll('/', '.');
const release = {version:`1.0.${count}+${sha.slice(0,7)}`, updated, commit:sha};
const output = path.join(root, '_site');
fs.mkdirSync(output, {recursive:true});
for (const file of git('ls-files', '-z').split('\0').filter(Boolean)) {
 if (!(/\.(html|css|js|json|svg|jpg|jpeg|png|webp)$/i.test(file) || ['.nojekyll','robots.txt'].includes(file)) || file.startsWith('scripts/') || file.startsWith('.github/')) continue;
 const destination = path.join(output, file);
 fs.mkdirSync(path.dirname(destination), {recursive:true});
 fs.copyFileSync(path.join(root,file), destination);
}
fs.writeFileSync(path.join(output,'version.json'), JSON.stringify(release)+'\n');
console.log(JSON.stringify(release));
