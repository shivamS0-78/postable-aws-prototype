const { DynamoDBClient, ListTablesCommand } = require("@aws-sdk/client-dynamodb")
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime")

require('dotenv').config({ path: '.env.local' })

async function test() {
  console.log("Region:", process.env.MY_AWS_REGION)
  console.log("Access Key:", process.env.MY_AWS_ACCESS_KEY_ID?.slice(0, 8) + "...")
  console.log("Bucket:", process.env.S3_BUCKET_NAME)
  console.log("Model:", process.env.BEDROCK_MODEL_ID)
  console.log("---")

  // Test DynamoDB
  try {
    console.log("Testing DynamoDB...")
    const dynamo = new DynamoDBClient({
      region: process.env.MY_AWS_REGION,
      credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY
      }
    })
    const tables = await dynamo.send(new ListTablesCommand({}))
    console.log("✅ DynamoDB works! Tables:", tables.TableNames)
  } catch (err) {
    console.log("❌ DynamoDB failed:", err.message)
  }

  // Test Bedrock
  try {
    console.log("\nTesting Bedrock (Nova Pro)...")
    const bedrock = new BedrockRuntimeClient({
      region: process.env.MY_AWS_REGION,
      credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY
      }
    })
    const response = await bedrock.send(new InvokeModelCommand({
      modelId: "us.amazon.nova-pro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: [{
            text: "Say hello and confirm you are Amazon Nova Pro on AWS Bedrock."
          }]
        }]
      })
    }))
    const result = JSON.parse(Buffer.from(response.body).toString())
    console.log("✅ Bedrock works! Nova Pro says:", result.output.message.content[0].text)
  } catch (err) {
    console.log("❌ Bedrock failed:", err.message)
  }
}

test()