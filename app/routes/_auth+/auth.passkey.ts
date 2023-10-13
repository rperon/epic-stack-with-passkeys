import { redirect, type DataFunctionArgs } from '@remix-run/node'
import {
	authenticator,
	getSessionExpirationDate,
} from '#app/utils/auth.server.ts'
import {
	WEBAUTHN_PROVIDER_NAME,
	providerLabels,
} from '#app/utils/connections.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { combineHeaders } from '#app/utils/misc.tsx'
import {
	destroyRedirectToHeader,
	getRedirectCookieValue,
} from '#app/utils/redirect-cookie.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { handleNewSession } from './login.tsx'

const destroyRedirectTo = { 'set-cookie': destroyRedirectToHeader }

export async function loader() {
	return redirect('/login')
}

export async function action({ request }: DataFunctionArgs) {
	const label = providerLabels[WEBAUTHN_PROVIDER_NAME]
	const redirectTo = getRedirectCookieValue(request)
	const authResult = await authenticator
		.authenticate(WEBAUTHN_PROVIDER_NAME, request, { throwOnError: true })
		.then(
			data => ({ success: true, data }) as const,
			error => ({ success: false, error }) as const,
		)
	if (!authResult.success) {
		console.error(authResult.error)
		throw await redirectWithToast(
			'/login',
			{
				title: 'Auth Failed',
				description: `There was an error authenticating with ${label}.`,
				type: 'error',
			},
			{ headers: destroyRedirectTo },
		)
	}

	return makeSession({ request, userId: authResult.data.id, redirectTo })
}

async function makeSession(
	{
		request,
		userId,
		redirectTo,
	}: { request: Request; userId: string; redirectTo?: string | null },
	responseInit?: ResponseInit,
) {
	redirectTo ??= '/'
	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId,
		},
	})
	return handleNewSession(
		{ request, session, redirectTo, remember: true },
		{ headers: combineHeaders(responseInit?.headers, destroyRedirectTo) },
	)
}
