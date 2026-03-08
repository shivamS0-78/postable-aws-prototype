import { S3Client } from "@aws-sdk/client-s3"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime"
import { TranscribeClient } from "@aws-sdk/client-transcribe"

const credentials = {
  accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
}

// S3 & DynamoDB use the main region (where your buckets/tables live)
const mainConfig = {
  region: process.env.MY_AWS_REGION || "eu-north-1",
  credentials,
}

// Bedrock needs a region where the service is available
const bedrockConfig = {
  region: process.env.BEDROCK_REGION || "us-east-1",
  credentials,
}

export const s3Client = new S3Client(mainConfig)
export const dynamoClient = new DynamoDBClient(mainConfig)
export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient)
export const bedrockClient = new BedrockRuntimeClient(bedrockConfig)
export const transcribeClient = new TranscribeClient(mainConfig)