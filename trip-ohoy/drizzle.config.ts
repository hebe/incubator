import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
const lines = readFileSync(resolve(dir, '.env.local'), 'utf-8').split('\n');
for (const line of lines) {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('#')) continue;
	const eq = trimmed.indexOf('=');
	if (eq === -1) continue;
	process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

export default defineConfig({
	schema: './src/lib/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL_UNPOOLED!
	}
});
