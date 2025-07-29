import express from "express";
import cors from "cors";
import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
import { DateTime } from "luxon";

dotenv.config();


const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

const app = express();
app.use(express.json());

app.use(cors({ 
    origin: "*" 
}));

app.get("/ping", (req, res) => {
  res.json({ 
    res: "pong" 
  });
});


// send message to a channe;
// works
app.post("/message", async (req, res) => {
  const { channel, text } = req.body;
  try {
    const response = await slackClient.chat.postMessage({
      channel,
      text,
    });
    res.json(response);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: error.message });
  }
});

// set time, when to send message
// works
app.post("/message/schedule", async (req, res) => {
  const { channel, text, date, time } = req.body;

  if (!channel || !text || !date || !time) {
    return res.status(400).json({ error: 'channel, text, date, and time are required' });
  }

  try {
    // Parse in Asia/Kolkata timezone (UTC+5:30)
    const scheduleDate = DateTime.fromISO(`${date}T${time}`, {
      zone: "Asia/Kolkata"
    });

    if (!scheduleDate.isValid) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }

    const post_at = Math.floor(scheduleDate.toSeconds());

    const now = Math.floor(DateTime.now().toSeconds());
    if (post_at <= now) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }

    const result = await slackClient.chat.scheduleMessage({
      channel,
      text,
      post_at
    });

    res.json({
      ok: true,
      scheduled_message_id: result.scheduled_message_id,
      post_at: result.post_at,
      message: 'Message scheduled successfully'
    });

  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({ error: 'Failed to schedule message' });
  }
});


// fetching all messages
// works
app.get("/messages", async (req, res) => {
  const { channel, latest, oldest, limit } = req.body;
  try {
    const response = await slackClient.conversations.history({
      channel,
      latest,
      oldest,
      limit: limit ? parseInt(limit) : 20,
    });
    res.json(response);
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ error: error.message });
  }
});



// edit message
// works
app.put("/message", async (req, res) => {
  const { channel, ts, text } = req.body;
  try {
    const response = await slackClient.chat.update({
      channel,
      ts,
      text,
    });
    res.json(response);
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ error: error.message });
  }
});


// delete message
// workss
app.delete("/message", async (req, res) => {
  const { channel, ts } = req.body;
  try {
    const response = await slackClient.chat.delete({
      channel,
      ts,
    });
    res.json(response);
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: error.message });
  }
});

//  list channels
app.get("/channels", async (req, res) => {
  try {
    const response = await slackClient.conversations.list();
    res.json(response);
  } catch (error) {
    console.error("Error listing channels:", error);
    res.status(500).json({ error: error.message });
  }
});


// getting single message
// works
app.get("/message", async (req, res) => {
  const { channel, ts } = req.body;
  if(!channel || !ts){
    res.status(404).json({error:"Please enter channel id and timestamp as ts"});
  }
  try {
    const response = await slackClient.conversations.history({
      channel,
      latest: ts,
      oldest: ts,
      inclusive: true,
      limit: 1,
    });
    if (response.messages && response.messages.length > 0) {
      res.json(response.messages[0]);
    } else {
      res.status(404).json({ error: "Message not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, "0.0.0.0", () => {
  console.log("Listening on port 5000");
});
