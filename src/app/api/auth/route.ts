import { NextRequest, NextResponse } from 'next/server'

const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
const cognitoEndpoint = `https://cognito-idp.${region}.amazonaws.com`

export async function POST(request: NextRequest) {
  try {
    const { target, body } = await request.json()

    if (!target || !body) {
      return NextResponse.json({ error: 'Missing target or body' }, { status: 400 })
    }

    const res = await fetch(cognitoEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(body),
    })

    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
