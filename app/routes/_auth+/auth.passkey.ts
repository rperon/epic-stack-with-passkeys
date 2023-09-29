import { redirect, type DataFunctionArgs } from '@remix-run/node'
import {
	authenticator,
	getSessionExpirationDate,
} from '#app/utils/auth.server.ts'
import { WEBAUTHN_PROVIDER_NAME } from '#app/utils/connections.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { handleNewSession } from './login.tsx'

export async function loader() {
	return redirect('/login')
}

export async function action({ request }: DataFunctionArgs) {
	const user = await authenticator.authenticate(WEBAUTHN_PROVIDER_NAME, request)
	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})

	return handleNewSession({ request, session, remember: false })
}
