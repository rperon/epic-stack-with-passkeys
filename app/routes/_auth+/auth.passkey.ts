import { redirect, type DataFunctionArgs } from '@remix-run/node'
import {
	authenticator,
} from '#app/utils/auth.server.ts'
import {  WEBAUTHN_PROVIDER_NAME, providerLabels } from '#app/utils/connections.tsx'
import { getRedirectCookieValue } from '#app/utils/redirect-cookie.server.ts'
import { destroyRedirectTo, makeSession } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'

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

	return makeSession({request, userId: authResult.data.id, redirectTo})
}
