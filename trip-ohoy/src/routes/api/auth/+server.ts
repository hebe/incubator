import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { APP_PASSWORD } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const { password } = await request.json();
	if (password === APP_PASSWORD) return json({ ok: true });
	error(401, 'Wrong password');
};
