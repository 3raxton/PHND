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
