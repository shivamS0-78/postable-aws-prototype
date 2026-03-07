import { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import { dynamoDocClient } from "./aws"

const TABLE = process.env.DYNAMODB_TABLE_NAME || "clipflow-videos"

export async function saveVideo(userId: string, video: any) {
  await dynamoDocClient.send(new PutCommand({
    TableName: TABLE,
    Item: { ...video, userId }
  }))
}

export async function getVideo(userId: string, id: string) {
  const result = await dynamoDocClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id }
  }))
  // Enforce tenant isolation
  if (result.Item && result.Item.userId !== userId) {
    return null
  }
  return result.Item
}

export async function getAllVideos(userId: string) {
  const result = await dynamoDocClient.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: "userId = :uid",
    ExpressionAttributeValues: {
      ":uid": userId
    }
  }))
  return result.Items || []
}

export async function updateVideo(userId: string, id: string, updates: any) {
  // First verify ownership
  const existing = await getVideo(userId, id)
  if (!existing) throw new Error("Video not found or access denied")

  const updateExpressions: string[] = []
  const expressionValues: any = {}
  const expressionNames: any = {}

  Object.keys(updates).forEach((key, i) => {
    updateExpressions.push(`#k${i} = :v${i}`)
    expressionValues[`:v${i}`] = updates[key]
    expressionNames[`#k${i}`] = key
  })

  await dynamoDocClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeValues: expressionValues,
    ExpressionAttributeNames: expressionNames
  }))
}

export async function deleteVideo(userId: string, id: string) {
  // First verify ownership
  const existing = await getVideo(userId, id)
  if (!existing) throw new Error("Video not found or access denied")

  await dynamoDocClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id }
  }))
}