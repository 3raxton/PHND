import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const required = ['SERVER_LOCK', 'SERVER_NAME', 'SERVER_TYPE', 'SERVER_URL'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
    console.error(`Missing env: ${missing.join(', ')}`);
    process.exit(1);
}

const template = readFileSync(join(root, 'settings.js.template'), 'utf8');

// Match nginx envsubst plus the Dockerfile defaults: unset FS_* stay as
// placeholders (the app ignores those). Other unset vars, such as
// REMOTE_URL, are empty strings. A leftover ${REMOTE_URL} is truthy and
// would be stored as the image base URL.
const settings = template.replaceAll(/\$\{([A-Za-z0-9_]+)\}/g, (match, name) => {
    const value = process.env[name];
    if (value === undefined) return name.startsWith('FS_') ? match : '';
    return value
        .replaceAll('\\', '\\\\')
        .replaceAll('"', '\\"')
        .replaceAll('\r', '\\r')
        .replaceAll('\n', '\\n');
});

writeFileSync(join(root, 'out/web/settings.js'), settings);

// Link previews read the static HTML. They do not run the tab-title script.
const serverName = process.env.SERVER_NAME;
if (serverName) {
    const indexPath = join(root, 'out/web/index.html');
    const safe = serverName
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    const meta = [
        `<meta property="og:title" content="${safe}" />`,
        `<meta property="og:site_name" content="${safe}" />`,
        `<meta name="twitter:title" content="${safe}" />`,
        `<meta name="apple-mobile-web-app-title" content="${safe}" />`,
    ].join('\n        ');
    const html = readFileSync(indexPath, 'utf8')
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${safe}</title>`)
        .replace('</head>', `        ${meta}\n    </head>`);
    writeFileSync(indexPath, html);
}
