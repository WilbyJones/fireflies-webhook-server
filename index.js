const express = require("express");
const { Client } = require("@hubspot/api-client");

const express = require("express");
const app = express();
app.use(express.json());

app.post("/webhook", (req, res) => {
  console.log("Webhook received from Fireflies.ai:", req.body);

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY || "PASTE_YOUR_TOKEN_HERE";
  
const hubspotClient = new Client({ accessToken: HUBSPOT_API_KEY });
  
  res.send({ status: "received" });
});

app.get("/", (req, res) => {
  res.send("Server is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
app.post("/webhook", async (req, res) => {
  const meetingData = req.body; // This contains info Fireflies sends

  // Extract useful details to match the meeting
  const contactEmail = meetingData.email; // You may need to adjust this name
  const meetingTitle = meetingData.title; // Fireflies may call this differently

  try {
    // Search for meetings in HubSpot (simplified example)
    const searchResponse = await hubspotClient.crm.objects.meetings.basicApi.getPage(10, undefined, undefined, ["hs_meeting_title"]);
    const meetings = searchResponse.body.results || [];
    const matchedMeeting = meetings.find(m => m.properties.hs_meeting_title === meetingTitle);

    if (!matchedMeeting) {
      res.status(404).send("Meeting not found");
      return;
    }

    // Update meeting to "Completed"
    await hubspotClient.crm.objects.meetings.basicApi.update(matchedMeeting.id, {
      properties: {
        hs_meeting_outcome: "COMPLETED"
      }
    });

    res.send("HubSpot meeting updated: COMPLETED");
  } catch (error) {
    console.error("HubSpot API error:", error);
    res.status(500).send("API update failed");
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
