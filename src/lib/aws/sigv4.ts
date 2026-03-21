// AWS Signature Version 4 signing — pure JS, no SDK
import { AWSConfig } from './config'

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacSHA256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const keyData = key instanceof ArrayBuffer ? key : new Uint8Array(key).buffer
  const cryptoKey = await crypto.subtle.importKey('raw', keyData as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return toHex(hash)
}

async function getSigningKey(secret: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSHA256(new TextEncoder().encode('AWS4' + secret), dateStamp)
  const kRegion = await hmacSHA256(kDate, region)
  const kService = await hmacSHA256(kRegion, service)
  return hmacSHA256(kService, 'aws4_request')
}

export async function signedRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string,
  service: string,
  region: string = AWSConfig.region
): Promise<Record<string, string>> {
  const parsedUrl = new URL(url)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateStamp = amzDate.slice(0, 8)

  const payloadHash = await sha256(body)

  const signedHeaders: Record<string, string> = {
    ...headers,
    host: parsedUrl.host,
    'x-amz-date': amzDate,
  }

  const headerKeys = Object.keys(signedHeaders).sort()
  const canonicalHeaders = headerKeys.map(k => `${k.toLowerCase()}:${signedHeaders[k].trim()}`).join('\n') + '\n'
  const signedHeaderStr = headerKeys.map(k => k.toLowerCase()).join(';')

  const canonicalRequest = [
    method,
    parsedUrl.pathname,
    parsedUrl.searchParams.toString(),
    canonicalHeaders,
    signedHeaderStr,
    payloadHash,
  ].join('\n')

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n')

  const signingKey = await getSigningKey(AWSConfig.iamSecretKey, dateStamp, region, service)
  const signature = toHex(await hmacSHA256(signingKey, stringToSign))

  const authorization = `AWS4-HMAC-SHA256 Credential=${AWSConfig.iamAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderStr}, Signature=${signature}`

  return {
    ...signedHeaders,
    authorization,
  }
}
