const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function checkLinkedIn() {
    console.log("Fetching connected accounts directly mapped from Dynamo (simulated)...");

    // We already know the user has LinkedIn connected because the route tried to post.
    // Instead of messing with DynamoDB SDK in raw node, we'll just check if the env vars are available
    console.log("Client ID:", process.env.LINKEDIN_CLIENT_ID);

    // Ask Next.js internal API to trigger a publish so we can read the JSON response
    console.log("Triggering local publish API to dump error...");

    // First get a video ID from the api
    const vidRes = await fetch("http://localhost:3000/api/videos");
    const vidData = await vidRes.json();
    if (!vidData.videos || vidData.videos.length === 0) {
        console.log("No videos found.");
        return;
    }
    const videoId = vidData.videos[0].id;
    console.log("Found video:", videoId);

    // Run the publish route
    const pubRes = await fetch("http://localhost:3000/api/scheduled-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            videoId: videoId,
            platforms: ["linkedin"]
        })
    });

    const result = await pubRes.json();
    console.log("JSON Result:");
    console.log(JSON.stringify(result, null, 2));
}

checkLinkedIn().catch(console.error);
