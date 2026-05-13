# Auth Manual Test Checklist

## Account creation
- Register with a new email and password.
- Confirm you are redirected to /profile/settings.
- Check that an email OTP is received.
- Submit the OTP and confirm the email becomes verified.

## Profile settings
- Update full name, birth date, theme, UI language, and font size.
- Refresh the page and confirm the saved values are loaded.

## Email 2FA
- Enable 2FA via email in settings.
- Log out.
- Log in with username/password and verify that an email OTP is required.
- Enter the OTP and confirm login completes.

## TOTP 2FA
- Click "Genera QR" in settings and scan with an authenticator app.
- Enter the TOTP code and confirm activation.
- Log out.
- Log in with username/password and verify the app code is required.

## Route guard
- While authenticated, attempt to open /auth/login and /auth/register.
- Confirm you are redirected to /.
- While unauthenticated, attempt to open a protected page (e.g. /profile).
- Confirm you are redirected to /auth/login.

## Logout
- Log out and verify the session is cleared.
- Refresh and confirm you remain logged out.
