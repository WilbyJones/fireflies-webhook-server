const express = require("express");
const { Client } = require("@hubspot/api-client");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

if (!HUBSPOT_API_KEY) {
  throw new Error("HUBSPOT_API_KEY environment variable is missing!");
}

const hubspotClient = new Client({ accessToken: HUBSPOT_API_KEY });

app.get("/", (req, res) => {
  res.send("Fireflies-HubSpot Integration Server is running!");
});

// Fireflies webhook endpoint
app.post("/fireflies-webhook", async (req, res) => {
  console.log("Fireflies webhook received:", req.body);
  
  try {
    const { meetingId, eventType } = req.body;
    
    if (eventType !== "Transcription completed") {
      return res.status(200).send("Event type not handled");
    }

    // Get transcript data from Fireflies
    const transcriptResponse = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIREFLIES_API_KEY}`
      },
      body: JSON.stringify({
        query: `
          query($transcriptId: String!) {
            transcript(id: $transcriptId) {
              title
              date
              duration
              attendees {
                name
                email
              }
            }
          }
        `,
        variables: { transcriptId: meetingId }
      })
    });
    
    const transcriptData = await transcriptResponse.json();
    const meeting = transcriptData.data.transcript;
    
    // Search for HubSpot meetings by multiple criteria
    const searchFilter = {
      filterGroups: [{
        filters: [
          {
            propertyName: "hs_meeting_title",
            operator: "CONTAINS_TOKEN",
            value: meeting.title
          },
          {
            propertyName: "hs_meeting_start_time",
            operator: "BETWEEN",
            value: meeting.date, // Add date range logic
            highValue: meeting.date + 3600000 // 1 hour window
          }
        ]
      }]
    };

    const searchResponse = await hubspotClient.crm.objects.meetings.searchApi.doSearch({
      filterGroups: searchFilter.filterGroups,
      properties: ["hs_meeting_title", "hs_meeting_outcome", "hs_meeting_start_time"]
    });

    if (!searchResponse.results || searchResponse.results.length === 0) {
      return res.status(404).send("No matching HubSpot meeting found");
    }

    // Update the first matching meeting
    const hubspotMeeting = searchResponse.results[0];
    await hubspotClient.crm.objects.meetings.basicApi.update(hubspotMeeting.id, {
      properties: { 
        hs_meeting_outcome: "COMPLETED",
        hs_meeting_body: `Meeting transcribed by Fireflies.ai. Duration: ${meeting.duration} minutes.`
      }
    });

    res.status(200).send(`HubSpot meeting ${hubspotMeeting.id} updated to COMPLETED`);

  } catch (error) {
    console.error("Fireflies webhook error:", error);
    res.status(500).send("Webhook processing failed");
  }
});

// HubSpot webhook endpoint (for future bidirectional sync)
app.post("/hubspot-webhook", async (req, res) => {
  console.log("HubSpot webhook received:", req.body);
  res.status(200).send("HubSpot webhook received");
});

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
