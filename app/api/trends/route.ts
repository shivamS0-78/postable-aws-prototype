import { NextRequest, NextResponse } from "next/server"
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"
import { bedrockClient } from "@/lib/aws"

export async function POST(req: NextRequest) {
  try {
    const { niche } = await req.json()

    const prompt = `You are a social media trend analyst with real-time knowledge of viral content.

For the content niche: "${niche || "general content creation"}"

Analyze and return trending opportunities. Respond ONLY in this exact JSON format:

{
  "trends": [
    {
      "topic": "trend topic name",
      "platform": "TikTok",
      "growth": 85,
      "description": "why this is trending and how to use it",
      "contentIdeas": ["idea 1", "idea 2"],
      "urgency": "high"
    }
  ],
  "summary": "2 sentence overview of the current landscape",
  "bestPlatform": "TikTok",
  "topHashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Generate 5 realistic trending topics with growth scores from 1-100.`

    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }]
      })
    }))

    const result = JSON.parse(Buffer.from(response.body).toString())
    const text = result.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const trends = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    return NextResponse.json({ trends })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}