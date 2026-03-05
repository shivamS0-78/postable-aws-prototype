import { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import { dynamoDocClient } from "./aws"

const TABLE = process.env.DYNAMODB_TABLE_NAME || "clipflow-videos"

export async function saveVideo(video: any) {
  await dynamoDocClient.send(new PutCommand({
    TableName: TABLE,
    Item: video
  }))
}

export async function getVideo(id: string) {
  const result = await dynamoDocClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id }
  }))
  return result.Item
}

export async function getAllVideos() {
  const result = await dynamoDocClient.send(new ScanCommand({
    TableName: TABLE
  }))
  return result.Items || []
}

export async function updateVideo(id: string, updates: any) {
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

export async function deleteVideo(id: string) {
  await dynamoDocClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id }
  }))
}