/** Error codes from auth callback / API mapped to user-friendly messages */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_token: "Verification link is invalid. Please sign up again.",
  verification_expired: "Verification link expired. Please sign up again.",
  verification_failed: "Verification failed. Please try again.",
  access_denied: "Sign-in was cancelled.",
  invalid_callback: "Invalid sign-in response. Please try again.",
  invalid_state: "Invalid state. Please try again.",
  oauth_error: "Something went wrong with sign-in. Please try again.",
  oauth_not_configured: "Google sign-in is not configured.",
  token_exchange_failed: "Sign-in failed. Please try again.",
  userinfo_failed: "Could not get your profile. Please try again.",
  no_email: "Google did not provide an email. Please try another account.",
  already_exists: "This email is already verified. Please sign in.",
  user_creation_failed: "Account could not be created. Please try again.",
};
