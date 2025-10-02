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
  res.send("Server is running!");
});

app.post("/webhook", async (req, res) => {
  console.log("Webhook received from Fireflies.ai:", req.body);

  const meetingData = req.body;
  const meetingTitle = meetingData.title; // adjust to Fireflies payload keys

  try {
    // Search meetings in HubSpot by title (improve by also filtering by time, etc.)
    const searchResponse = await hubspotClient.crm.objects.meetings.basicApi.getPage(
      10,
      undefined,
      undefined,
      ["hs_meeting_title"]
    );
    const meetings = searchResponse.body.results || [];
    const matchedMeeting = meetings.find(
      (m) => m.properties.hs_meeting_title === meetingTitle
    );

    if (!matchedMeeting) {
      res.status(404).send("Meeting not found");
      return;
    }

    // Update meeting status to "COMPLETED"
    await hubspotClient.crm.objects.meetings.basicApi.update(matchedMeeting.id, {
      properties: { hs_meeting_outcome: "COMPLETED" },
    });

    res.send("HubSpot meeting updated: COMPLETED");
  } catch (error) {
    console.error("HubSpot API error:", error);
    res.status(500).send("API update failed");
  }
});

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
