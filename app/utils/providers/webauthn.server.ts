import { type Authenticator } from '@prisma/client'
import { type WebAuthnOptions, WebAuthnStrategy } from 'remix-auth-webauthn'
import { prisma } from '../db.server.ts'
import { type ProviderUser, type AuthProvider } from './provider.ts'

// const shouldMock = process.env.WEB_AUTHN_ORIGIN.startsWith('MOCK_')

export class WebAuthnProvider implements AuthProvider {
	getAuthStrategy() {
		return new WebAuthnStrategy<ProviderUser>(
			{
				rpName: 'Epic Stack WebAuthn Example',
				rpID:
					process.env.NODE_ENV === 'development'
						? 'localhost'
						: process.env.WEB_AUTHN_ORIGIN,
				origin: process.env.WEB_AUTHN_ORIGIN,

				getUserAuthenticators: async user => {
					const authenticators = await prisma.authenticator.findMany({
						where: { userId: user?.id },
					})
					return authenticators.map(authenticator => ({
						...authenticator,
						transports: authenticator.transports.split(','),
					}))
				},
				getUserDetails: user => {
					if (!user) return null
					return {
						id: user.id,
						username: user.email,
						displayName: user.name ?? undefined,
					}
				},
				async getUserByUsername(username) {
					const user = await prisma.user.findUnique({ where: { username } })

					return user
						? {
								id: user.id,
								email: user.email,
								username: user.username,
								name: user.name ?? undefined,
								imageUrl: '',
						  }
						: null
				},
				async getAuthenticatorById(id) {
					const auth = (await prisma.authenticator.findUnique({
						where: { credentialID: id },
					})) satisfies Authenticator | null

					return auth
						? {
								...auth,
								counter: new Number(auth.counter).valueOf(),
								credentialBackedUp: new Number(
									auth.credentialBackedUp,
								).valueOf(),
						  }
						: null
				},
			} satisfies WebAuthnOptions<ProviderUser>,
			async function verify({ authenticator, type, username }) {
				const savedAuthenticator = await prisma.authenticator.findUnique({
					where: { credentialID: authenticator.credentialID },
					include: { user: true },
				})

				switch (type) {
					case 'registration':
						if (savedAuthenticator) {
							throw new Error('Authenticator already registered')
						} else {
							// Username is null for authentication verification,
							// but required for registration verification.
							// It is unlikely this error will ever be thrown,
							// but it helps with the TypeScript checking
							if (!username) throw new Error('Username is required.')
							// we need to get the user from the database

							let user = await prisma.user.findFirstOrThrow({
								where: { username },
							})

							// we add the authenticator to the user
							await prisma.user.update({
								where: {
									id: user?.id,
								},
								data: {
									authenticators: {
										create: {
											credentialID: authenticator.credentialID,
											credentialPublicKey: authenticator.credentialPublicKey,
											counter: authenticator.counter,
											credentialDeviceType: authenticator.credentialDeviceType,
											credentialBackedUp: new Boolean(
												authenticator.credentialBackedUp,
											).valueOf(),
											transports: authenticator.transports,
										},
									},
								},
							})

							return {
								id: user.id,
								email: user.email,
								username: user.username,
								name: user.name ?? undefined,
							}
						}
					case 'authentication':
						if (!savedAuthenticator) throw new Error('Authenticator not found')
						return {
							id: savedAuthenticator.userId,
							email: savedAuthenticator.user.email,
							username: savedAuthenticator.user.username,
							name: savedAuthenticator.user.name ?? undefined,
						}
				}
			},
		)
	}

	async resolveConnectionData(providerId: string) {
		return {
			displayName: 'Unknown',
			link: null,
		} as const
	}

	async handleMockAction(request: Request) {
		// if (!shouldMock) return
		// const connectionSession = await connectionSessionStorage.getSession(
		// 	request.headers.get('cookie'),
		// )
		// const state = cuid()
		// connectionSession.set('oauth2:state', state)
		// const code = 'MOCK_CODE_GITHUB_KODY'
		// const searchParams = new URLSearchParams({ code, state })
		// throw redirect(`/auth/github/callback?${searchParams}`, {
		// 	headers: {
		// 		'set-cookie':
		// 			await connectionSessionStorage.commitSession(connectionSession),
		// 	},
		// })
	}
}
