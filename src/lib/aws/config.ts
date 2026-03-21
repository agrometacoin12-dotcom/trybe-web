// AWS Configuration — reads secrets from environment variables
// Set these in .env.local (gitignored) or Vercel Environment Variables
export const AWSConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  accountId: process.env.NEXT_PUBLIC_AWS_ACCOUNT_ID || '',

  // Cognito
  cognitoUserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  cognitoAppClientId: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID || '',
  cognitoClientSecret: '',
  cognitoEndpoint: `https://cognito-idp.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com`,

  // API Gateway
  lambdaApiEndpoint: process.env.NEXT_PUBLIC_LAMBDA_API_ENDPOINT || '',

  // S3
  s3BucketName: process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'trybe-app-media',
  s3Region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  s3BaseURL: `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'trybe-app-media'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com`,
  s3AccelerateURL: `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME || 'trybe-app-media'}.s3-accelerate.amazonaws.com`,

  // IVS
  ivsStageArn: process.env.NEXT_PUBLIC_IVS_STAGE_ARN || '',
  ivsDedicatedChannelArn: process.env.NEXT_PUBLIC_IVS_CHANNEL_ARN || '',

  // DynamoDB Tables
  tableUsers: 'trybeusers',
  tableStreams: 'trybestreams',
  tableMessages: 'trybemessages',
  tableChat: 'trybechat',
  tableStories: 'trybestories',
  tableReels: 'trybereels',
  tableReelComments: 'trybereelcomments',
  tableReelLikes: 'trybereellikes',
  tableReelCommentLikes: 'trybereelcommentlikes',
  tableGiftCatalog: 'trybegiftcatalog',
  tableGiftWallets: 'trybegiftwallets',
  tableGiftTransactions: 'trybegifttransactions',
  tableCalls: 'trybecalls',

  // IAM — set via environment variables, never commit secrets
  iamAccessKeyId: process.env.NEXT_PUBLIC_IAM_ACCESS_KEY_ID || '',
  iamSecretKey: process.env.NEXT_PUBLIC_IAM_SECRET_KEY || '',

  // Agora
  agoraAppId: process.env.NEXT_PUBLIC_AGORA_APP_ID || '',
} as const
