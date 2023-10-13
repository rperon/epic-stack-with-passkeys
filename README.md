# [Epic Stack](https://github.com/epicweb-dev/epic-stack) with [remix-auth-webauthn](https://github.com/alexanderson1993/remix-auth-webauthn) and [remix-auth](https://github.com/sergiodxa/remix-auth)

// TODO : Screenshot with passkey

This demonstrates how to use
[remix-auth-webauthn](https://github.com/alexanderson1993/remix-auth-webauthn)
and [remix-auth](https://github.com/sergiodxa/remix-auth) with the
[Epic Stack](https://github.com/epicweb-dev/epic-stack).

This example show you how you can create a new account with a passkey and login
to your account with a passkey.

To check out the changes, check [the git commit history](). The important parts
are:

1. Creation of a new model called Authenticator. It will contain the required
   information to retrieve the passkey. `prisma/scheam.prisma`

2. Creation of a new provider called `webauthn.server.ts`. This provider
   implements the WebAuthnStrategy from `remix-auth-webauthn`. The most
   important part is in the `verify` function. This function is used to register
   a new passkey and to authenticate an existing passkey. Upon registration, we
   create a new `Authenticator` entry in the database and link it to the user.

3. The onboarding process is a little bit different with `passkey` and has to be
   modify. The start of the onboarding is the same as before, you verify your
   email and then you access the onboarding routes where you can create your
   account.

   To register your passkey, i added a link to a new page called
   `routes/_auth+/onboarding_.passkey.tsx`, the user can switch from using a
   password or a passkey.

   The loader for this file is a little bit complicated, we first have to call

   ```ts
   await authenticator.authenticate(WEBAUTHN_PROVIDER_NAME, request)
   ```

   But this call will throw and we need to catch it. It will contain a Response
   object of the following type `WebAuthnOptionsResponse`. Those information are
   required to start the passkey process, so we return them from our loader.
   (line 71 to 85)

   In the user interface, we are going to use that data when the user submit the
   form with its username and name. If the formData is valid (for example the
   username is available), then on the onSubmit event we will call a function
   named `handleFormSubmit` from `remix-auth-webauthn` like this :

   ```ts
   const [form, fields] = useForm({
   	...
   	onValidate({ formData }) {
   		const result = parse(formData, { schema: SignupPasskeyFormSchema })
   		return result
   	},
   	onSubmit(event) {
   		handleFormSubmit(data, 'registration')(event)
   	},
   	shouldRevalidate: 'onBlur',
   })
   ```

   The `handleFormSubmit` will trigger the passkey process and upon success
   register your user.

   To finish the process, we need to save all the important part in the
   database.

   In the `action` function if the form is valid we create a new session with
   the function `signupWithWebauthn` (see `app/utils/auth.server.ts`) and then
   call `authenticator.authenticate()`.

4. The login process is very similar to the previous one. The `loader` is very
   similar with the one for registration.

   To start the authentication process, we are re-using the
   `ProviderConnectionForm` which create a login button for each connection.
   Like for the registration, we need to use `handleFormSubmit` from
   `remix-auth-webauthn` when we submit the form. The `action` for this form is
   located in the route `auth.passkey.ts` where we will call
   `authenticator.authenticate()`.

This example is following the readme of
[remix-auth-webauthn](https://github.com/alexanderson1993/remix-auth-webauthn).

Thanks to [alexanderson1993](https://github.com/alexanderson1993) and
[kentcdodds](https://github.com/kentcdodds) for the help.
