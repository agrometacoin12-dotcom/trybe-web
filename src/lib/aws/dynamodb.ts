// DynamoDB REST API — proxied through /api/db to avoid CORS + keep secrets server-side
import { AWSConfig } from './config'

async function dynamoRequest(target: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, body }),
  })
  const json = await res.json()

  if (!res.ok) {
    const errType = json.__type || ''
    if (errType.includes('ResourceNotFoundException')) {
      throw new Error('ResourceNotFoundException')
    }
    throw new Error(json.message || json.Message || JSON.stringify(json))
  }
  return json
}

// Auto-create table if missing
async function ensureTable(name: string, pk: string, sk?: string) {
  const keySchema: Array<{ AttributeName: string; KeyType: string }> = [{ AttributeName: pk, KeyType: 'HASH' }]
  const attrDefs: Array<{ AttributeName: string; AttributeType: string }> = [{ AttributeName: pk, AttributeType: 'S' }]
  if (sk) {
    keySchema.push({ AttributeName: sk, KeyType: 'RANGE' })
    attrDefs.push({ AttributeName: sk, AttributeType: 'S' })
  }
  try {
    await dynamoRequest('DynamoDB_20120810.CreateTable', {
      TableName: name,
      KeySchema: keySchema,
      AttributeDefinitions: attrDefs,
      BillingMode: 'PAY_PER_REQUEST',
    })
    await new Promise(r => setTimeout(r, 5000))
  } catch {
    // Table already exists — fine
  }
}

async function withRetry(tableName: string, pk: string, sk: string | undefined, fn: () => Promise<Record<string, unknown>>) {
  try {
    return await fn()
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'ResourceNotFoundException') {
      await ensureTable(tableName, pk, sk)
      return fn()
    }
    throw e
  }
}

// Helper: parse DynamoDB attribute value
function s(item: Record<string, unknown>, key: string): string {
  const attr = item[key] as Record<string, string> | undefined
  return attr?.S || ''
}
function n(item: Record<string, unknown>, key: string): number {
  const attr = item[key] as Record<string, string> | undefined
  return parseInt(attr?.N || '0', 10)
}
function b(item: Record<string, unknown>, key: string): boolean {
  const attr = item[key] as Record<string, boolean> | undefined
  return attr?.BOOL || false
}

// ---- User Operations ----

export interface TrybeUser {
  id: string; username: string; displayName: string; avatarURL?: string; coverURL?: string;
  bio?: string; followerCount: number; followingCount: number; totalLikes: number;
  isLive: boolean; isVerified: boolean; role: string; createdAt: string
}

function parseUser(item: Record<string, unknown>): TrybeUser | null {
  const id = s(item, 'id')
  if (!id) return null
  return {
    id, username: s(item, 'username'), displayName: s(item, 'displayName'),
    avatarURL: s(item, 'avatarURL') || undefined, coverURL: s(item, 'coverURL') || undefined,
    bio: s(item, 'bio') || undefined,
    followerCount: n(item, 'followerCount'), followingCount: n(item, 'followingCount'),
    totalLikes: n(item, 'totalLikes'), isLive: b(item, 'isLive'),
    isVerified: b(item, 'isVerified'), role: s(item, 'role') || 'viewer',
    createdAt: s(item, 'createdAt'),
  }
}

export async function getUser(userId: string): Promise<TrybeUser | null> {
  const res = await withRetry(AWSConfig.tableUsers, 'id', undefined, () =>
    dynamoRequest('DynamoDB_20120810.GetItem', {
      TableName: AWSConfig.tableUsers,
      Key: { id: { S: userId } },
    })
  )
  const item = res.Item as Record<string, unknown> | undefined
  return item ? parseUser(item) : null
}

export async function createUserProfile(user: TrybeUser): Promise<void> {
  await withRetry(AWSConfig.tableUsers, 'id', undefined, () =>
    dynamoRequest('DynamoDB_20120810.PutItem', {
      TableName: AWSConfig.tableUsers,
      Item: {
        id: { S: user.id }, username: { S: user.username }, displayName: { S: user.displayName },
        avatarURL: { S: user.avatarURL || '' }, bio: { S: user.bio || '' },
        followerCount: { N: '0' }, followingCount: { N: '0' }, totalLikes: { N: '0' },
        isLive: { BOOL: false }, isVerified: { BOOL: false }, role: { S: user.role || 'viewer' },
        createdAt: { S: new Date().toISOString() },
      },
    })
  )
}

export async function listUsers(limit = 100): Promise<TrybeUser[]> {
  const res = await withRetry(AWSConfig.tableUsers, 'id', undefined, () =>
    dynamoRequest('DynamoDB_20120810.Scan', { TableName: AWSConfig.tableUsers, Limit: limit })
  )
  const items = (res.Items || []) as Array<Record<string, unknown>>
  return items.map(parseUser).filter((u): u is TrybeUser => u !== null)
}

// ---- Reel Operations ----

export interface TrybeReel {
  id: string; userId: string; user?: TrybeUser; videoURL: string; thumbnailURL?: string;
  caption?: string; viewCount: number; likeCount: number; commentCount: number;
  isLiked: boolean; createdAt: string
}

function parseReel(item: Record<string, unknown>): TrybeReel | null {
  const id = s(item, 'id')
  if (!id) return null
  return {
    id, userId: s(item, 'userId'), videoURL: s(item, 'videoURL'),
    thumbnailURL: s(item, 'thumbnailURL') || undefined,
    caption: s(item, 'caption') || undefined,
    viewCount: n(item, 'viewCount'), likeCount: n(item, 'likeCount'),
    commentCount: n(item, 'commentCount'), isLiked: false,
    createdAt: s(item, 'createdAt'),
  }
}

export async function getReels(limit = 50): Promise<TrybeReel[]> {
  const res = await withRetry(AWSConfig.tableReels, 'id', undefined, () =>
    dynamoRequest('DynamoDB_20120810.Scan', { TableName: AWSConfig.tableReels, Limit: limit })
  )
  const items = (res.Items || []) as Array<Record<string, unknown>>
  return items.map(parseReel).filter((r): r is TrybeReel => r !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function setReelLike(reelId: string, userId: string, isLiked: boolean): Promise<boolean> {
  try {
    if (isLiked) {
      await dynamoRequest('DynamoDB_20120810.PutItem', {
        TableName: AWSConfig.tableReelLikes,
        Item: { reelId: { S: reelId }, userId: { S: userId }, createdAt: { S: new Date().toISOString() } },
        ConditionExpression: 'attribute_not_exists(reelId) AND attribute_not_exists(userId)',
      })
    } else {
      await dynamoRequest('DynamoDB_20120810.DeleteItem', {
        TableName: AWSConfig.tableReelLikes,
        Key: { reelId: { S: reelId }, userId: { S: userId } },
        ConditionExpression: 'attribute_exists(reelId) AND attribute_exists(userId)',
      })
    }
  } catch {
    return false
  }
  // Best-effort count update
  try {
    await dynamoRequest('DynamoDB_20120810.UpdateItem', {
      TableName: AWSConfig.tableReels, Key: { id: { S: reelId } },
      UpdateExpression: 'ADD likeCount :d',
      ExpressionAttributeValues: { ':d': { N: isLiked ? '1' : '-1' } },
    })
  } catch { /* fire and forget */ }
  return true
}

// ---- Stream Operations ----

export interface TrybeStream {
  id: string; userId: string; user?: TrybeUser; title: string; category: string;
  thumbnailURL?: string; isLive: boolean; viewerCount: number; totalLikes: number;
  ivsPlaybackURL?: string; startedAt?: string
}

function parseStream(item: Record<string, unknown>): TrybeStream | null {
  const id = s(item, 'id')
  if (!id) return null
  return {
    id, userId: s(item, 'userId'), title: s(item, 'title'), category: s(item, 'category'),
    thumbnailURL: s(item, 'thumbnailURL') || undefined,
    isLive: b(item, 'isLive'), viewerCount: n(item, 'viewerCount'),
    totalLikes: n(item, 'totalLikes'),
    ivsPlaybackURL: s(item, 'ivsPlaybackURL') || undefined,
    startedAt: s(item, 'startedAt') || undefined,
  }
}

export async function getLiveStreams(): Promise<TrybeStream[]> {
  const res = await withRetry(AWSConfig.tableStreams, 'id', undefined, () =>
    dynamoRequest('DynamoDB_20120810.Scan', {
      TableName: AWSConfig.tableStreams,
      FilterExpression: 'isLive = :t',
      ExpressionAttributeValues: { ':t': { BOOL: true } },
    })
  )
  const items = (res.Items || []) as Array<Record<string, unknown>>
  return items.map(parseStream).filter((s): s is TrybeStream => s !== null)
}

// ---- Message Operations ----

export interface DirectMessage {
  id: string; conversationId: string; senderId: string; sender?: TrybeUser;
  content: string; messageType: string; mediaURL?: string; mediaDuration?: number;
  isRead: boolean; createdAt: string
}

export interface Conversation {
  id: string; participants: TrybeUser[]; lastMessage?: DirectMessage;
  isGroup: boolean; groupName?: string; unreadCount: number; updatedAt: string
}

export function directConversationId(userA: string, userB: string): string {
  return [userA, userB].sort().map(u => `dm#${u}`).join('#').replace(/^dm#/, 'dm#')
    .replace(/^(.*)$/, () => `dm#${[userA, userB].sort().join('#')}`)
}

export async function getMessages(conversationId: string, limit = 100): Promise<DirectMessage[]> {
  const res = await withRetry(AWSConfig.tableMessages, 'conversationId', 'createdAt', () =>
    dynamoRequest('DynamoDB_20120810.Query', {
      TableName: AWSConfig.tableMessages,
      KeyConditionExpression: 'conversationId = :cid',
      ExpressionAttributeValues: { ':cid': { S: conversationId } },
      ScanIndexForward: false, Limit: limit,
    })
  )
  const items = (res.Items || []) as Array<Record<string, unknown>>
  return items.map(item => ({
    id: s(item, 'id'), conversationId: s(item, 'conversationId'),
    senderId: s(item, 'senderId'), content: s(item, 'content'),
    messageType: s(item, 'messageType') || 'text',
    mediaURL: s(item, 'mediaURL') || undefined,
    isRead: b(item, 'isRead'), createdAt: s(item, 'createdAt'),
  })).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function sendDirectMessage(msg: DirectMessage): Promise<void> {
  await withRetry(AWSConfig.tableMessages, 'conversationId', 'createdAt', () =>
    dynamoRequest('DynamoDB_20120810.PutItem', {
      TableName: AWSConfig.tableMessages,
      Item: {
        conversationId: { S: msg.conversationId }, createdAt: { S: msg.createdAt },
        id: { S: msg.id }, senderId: { S: msg.senderId }, content: { S: msg.content },
        messageType: { S: msg.messageType }, mediaURL: { S: msg.mediaURL || '' },
        isRead: { BOOL: msg.isRead },
      },
    })
  )
}

export async function getInboxConversations(userId: string): Promise<Conversation[]> {
  const res = await withRetry(AWSConfig.tableMessages, 'conversationId', 'createdAt', () =>
    dynamoRequest('DynamoDB_20120810.Scan', {
      TableName: AWSConfig.tableMessages,
      FilterExpression: 'contains(conversationId, :uid)',
      ExpressionAttributeValues: { ':uid': { S: userId } },
      Limit: 500,
    })
  )
  const items = (res.Items || []) as Array<Record<string, unknown>>
  const convMap = new Map<string, DirectMessage[]>()
  for (const item of items) {
    const cid = s(item, 'conversationId')
    const msg: DirectMessage = {
      id: s(item, 'id'), conversationId: cid, senderId: s(item, 'senderId'),
      content: s(item, 'content'), messageType: s(item, 'messageType') || 'text',
      isRead: b(item, 'isRead'), createdAt: s(item, 'createdAt'),
    }
    if (!convMap.has(cid)) convMap.set(cid, [])
    convMap.get(cid)!.push(msg)
  }
  const conversations: Conversation[] = []
  Array.from(convMap.entries()).forEach(([id, msgs]) => {
    const sorted = msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    conversations.push({
      id, participants: [], lastMessage: sorted[0], isGroup: false,
      unreadCount: sorted.filter(m => !m.isRead && m.senderId !== userId).length,
      updatedAt: sorted[0]?.createdAt || new Date().toISOString(),
    })
  })
  return conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// ---- Call Operations ----

export interface CallRecord {
  callId: string; channelName: string; callerId: string; calleeId: string;
  callerName: string; callerAvatar?: string; callType: 'voice' | 'video';
  status: string; createdAt: string
}

export async function createCallRecord(record: CallRecord): Promise<void> {
  await withRetry(AWSConfig.tableCalls, 'callerId', 'callId', () =>
    dynamoRequest('DynamoDB_20120810.PutItem', {
      TableName: AWSConfig.tableCalls,
      Item: {
        callerId: { S: record.callerId }, callId: { S: record.callId },
        channelName: { S: record.channelName }, calleeId: { S: record.calleeId },
        callerName: { S: record.callerName }, callerAvatar: { S: record.callerAvatar || '' },
        callType: { S: record.callType }, status: { S: record.status },
        createdAt: { S: record.createdAt },
      },
    })
  )
}

export async function getIncomingCall(userId: string): Promise<CallRecord | null> {
  const res = await withRetry(AWSConfig.tableCalls, 'callerId', 'callId', () =>
    dynamoRequest('DynamoDB_20120810.Scan', {
      TableName: AWSConfig.tableCalls,
      FilterExpression: 'calleeId = :uid AND #s = :ringing',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':uid': { S: userId }, ':ringing': { S: 'ringing' } },
      Limit: 10,
    })
  )
  const items = (res.Items || []) as Array<Record<string, unknown>>
  for (const item of items) {
    const createdAt = s(item, 'createdAt')
    if (Date.now() - new Date(createdAt).getTime() < 60000) {
      return {
        callId: s(item, 'callId'), channelName: s(item, 'channelName'),
        callerId: s(item, 'callerId'), calleeId: s(item, 'calleeId'),
        callerName: s(item, 'callerName'), callerAvatar: s(item, 'callerAvatar') || undefined,
        callType: s(item, 'callType') as 'voice' | 'video', status: s(item, 'status'),
        createdAt,
      }
    }
  }
  return null
}

export async function updateCallStatus(callId: string, callerId: string, status: string): Promise<void> {
  await dynamoRequest('DynamoDB_20120810.UpdateItem', {
    TableName: AWSConfig.tableCalls,
    Key: { callerId: { S: callerId }, callId: { S: callId } },
    UpdateExpression: 'SET #s = :s',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': { S: status } },
  })
}
