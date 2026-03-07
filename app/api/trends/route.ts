import { NextRequest, NextResponse } from "next/server"
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"
import { bedrockClient } from "@/lib/aws"

export async function POST(req: NextRequest) {
  try {
    const { niche, platforms } = await req.json()

    const platformsText = platforms && platforms.length > 0
      ? `Limit your platform suggestions STRICTLY to the following: ${platforms.join(", ")}.`
      : "Limit your platform suggestions STRICTLY to YouTube, Instagram, X (Twitter), and LinkedIn. DO NOT include TikTok under any circumstances.";

    const prompt = `You are a social media trend analyst with real-time knowledge of viral content.

For the content niche: "${niche || "general content creation"}"
${platformsText}

Analyze and return trending opportunities. Respond ONLY in this exact JSON format:

{
  "trends": [
    {
      "topic": "trend topic name",
      "platform": "Instagram",
      "growth": 85,
      "description": "why this is trending and how to use it",
      "contentIdeas": ["idea 1", "idea 2"],
      "urgency": "high"
    }
  ],
  "summary": "2 sentence overview of the current landscape",
  "bestPlatform": "Instagram",
  "topHashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Generate 5 realistic trending topics with growth scores from 1-100.`

    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID || "amazon.nova-pro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: [{ text: prompt }]
        }]
      })
    }))

    const result = JSON.parse(Buffer.from(response.body).toString())
    const text = result.output.message.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const trends = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    return NextResponse.json({ trends })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}