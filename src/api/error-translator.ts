export const getServerErrorTranslationKey = (message: string): string => {
  const msg = (message || '').toLowerCase()
  if (msg.includes('invalid email or password') || msg.includes('invalid credentials') || msg.includes('auth_failed')) {
    return 'errors.invalid_credentials'
  }
  if (msg.includes('email already exists') || msg.includes('user already exists') || msg.includes('already registered')) {
    return 'errors.email_exists'
  }
  if (msg.includes('user not found') || msg.includes('email not found')) {
    return 'errors.user_not_found'
  }
  if (msg.includes('username already exists') || msg.includes('username_exists')) {
    return 'errors.username_exists'
  }
  if (msg.includes('invalid confirmation code') || msg.includes('invalid code') || msg.includes('code_invalid')) {
    return 'errors.code_invalid'
  }
  if (msg.includes('password must be') || msg.includes('password_length')) {
    return 'errors.password_length'
  }
  if (msg.includes('passwords do not match') || msg.includes('password_mismatch')) {
    return 'errors.password_mismatch'
  }
  if (msg.includes('username can contain only') || msg.includes('username_invalid')) {
    return 'errors.username_invalid'
  }
  return ''
}

export const translateServerError = (message: string, t: (key: string) => string): string => {
  const key = getServerErrorTranslationKey(message)
  return key ? t(key) : message
}
