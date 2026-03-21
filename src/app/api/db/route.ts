import { NextRequest, NextResponse } from 'next/server'

const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
const accessKeyId = process.env.NEXT_PUBLIC_IAM_ACCESS_KEY_ID || ''
const secretKey = process.env.NEXT_PUBLIC_IAM_SECRET_KEY || ''
const endpoint = `https://dynamodb.${region}.amazonaws.com`

// --- SigV4 signing (server-side) ---

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacSHA256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const keyData = key instanceof ArrayBuffer ? key : new Uint8Array(key).buffer as ArrayBuffer
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return toHex(hash)
}

async function getSigningKey(secret: string, dateStamp: string, reg: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSHA256(new TextEncoder().encode('AWS4' + secret), dateStamp)
  const kRegion = await hmacSHA256(kDate, reg)
  const kService = await hmacSHA256(kRegion, service)
  return hmacSHA256(kService, 'aws4_request')
}

async function signedHeaders(bodyStr: string, target: string): Promise<Record<string, string>> {
  const parsedUrl = new URL(endpoint)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = await sha256(bodyStr)

  const headers: Record<string, string> = {
    'content-type': 'application/x-amz-json-1.0',
    'x-amz-target': target,
    'host': parsedUrl.host,
    'x-amz-date': amzDate,
  }

  const headerKeys = Object.keys(headers).sort()
  const canonicalHeaders = headerKeys.map(k => `${k.toLowerCase()}:${headers[k].trim()}`).join('\n') + '\n'
  const signedHeaderStr = headerKeys.map(k => k.toLowerCase()).join(';')

  const canonicalRequest = [
    'POST', parsedUrl.pathname, '', canonicalHeaders, signedHeaderStr, payloadHash,
  ].join('\n')

  const credentialScope = `${dateStamp}/${region}/dynamodb/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256(canonicalRequest),
  ].join('\n')

  const signingKey = await getSigningKey(secretKey, dateStamp, region, 'dynamodb')
  const signature = toHex(await hmacSHA256(signingKey, stringToSign))

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderStr}, Signature=${signature}`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { target, body } = await request.json()

    if (!target || !body) {
      return NextResponse.json({ error: 'Missing target or body' }, { status: 400 })
    }

    const bodyStr = JSON.stringify(body)
    const headers = await signedHeaders(bodyStr, target)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: bodyStr,
    })

    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
