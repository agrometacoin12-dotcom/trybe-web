// Cognito REST API — proxied through /api/auth to avoid CORS
import { AWSConfig } from './config'

async function cognitoRequest(target: string, body: Record<string, unknown>) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, body }),
  })
  const json = await res.json()
  if (!res.ok) {
    const errType = (json.__type || '').split('#').pop() || 'Unknown'
    const errMap: Record<string, string> = {
      UserNotFoundException: 'No account found with that email.',
      NotAuthorizedException: 'Incorrect email or password.',
      UserNotConfirmedException: 'Please verify your email before signing in.',
      UsernameExistsException: 'An account with this email already exists.',
      InvalidPasswordException: 'Password must be 8+ chars, uppercase, lowercase, number.',
      CodeMismatchException: 'Invalid verification code.',
      ExpiredCodeException: 'Verification code expired, request a new one.',
      TooManyRequestsException: 'Too many attempts, please wait.',
    }
    throw new Error(errMap[errType] || json.message || json.Message || json.error || errType)
  }
  return json
}

export async function signUp(email: string, password: string, username: string) {
  return cognitoRequest('SignUp', {
    ClientId: AWSConfig.cognitoAppClientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'preferred_username', Value: username },
    ],
  })
}

export async function confirmSignUp(email: string, code: string) {
  return cognitoRequest('ConfirmSignUp', {
    ClientId: AWSConfig.cognitoAppClientId,
    Username: email,
    ConfirmationCode: code,
  })
}

export async function signIn(email: string, password: string) {
  const res = await cognitoRequest('InitiateAuth', {
    ClientId: AWSConfig.cognitoAppClientId,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: email, PASSWORD: password },
  })
  return res.AuthenticationResult as {
    AccessToken: string; IdToken: string; RefreshToken: string
  }
}

export async function refreshTokens(refreshToken: string) {
  const res = await cognitoRequest('InitiateAuth', {
    ClientId: AWSConfig.cognitoAppClientId,
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  })
  return res.AuthenticationResult as { AccessToken: string; IdToken: string }
}

export async function getUser(accessToken: string) {
  return cognitoRequest('GetUser', { AccessToken: accessToken })
}

export async function forgotPassword(email: string) {
  return cognitoRequest('ForgotPassword', {
    ClientId: AWSConfig.cognitoAppClientId, Username: email,
  })
}

export async function confirmForgotPassword(email: string, code: string, newPassword: string) {
  return cognitoRequest('ConfirmForgotPassword', {
    ClientId: AWSConfig.cognitoAppClientId,
    Username: email, ConfirmationCode: code, Password: newPassword,
  })
}

export async function resendVerificationCode(email: string) {
  return cognitoRequest('ResendConfirmationCode', {
    ClientId: AWSConfig.cognitoAppClientId, Username: email,
  })
}

// Decode JWT payload (for getting sub/email from idToken)
export function decodeJWT(token: string): Record<string, string> {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return {}
  }
}
