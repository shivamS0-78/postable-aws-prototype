import { S3Client } from "@aws-sdk/client-s3"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime"
import { TranscribeClient } from "@aws-sdk/client-transcribe"

const config = {
  region: process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
}

export const s3Client = new S3Client(config)
export const dynamoClient = new DynamoDBClient(config)
export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient)
export const bedrockClient = new BedrockRuntimeClient(config)
export const transcribeClient = new TranscribeClient(config)