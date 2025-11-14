const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// TEMP: in-memory database (because SQLite can't run on Vercel)
let teamMemberEmails = {};
let sentEmails = [];

// Google sheet config
const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
const SHEET_NAME = "Sheet1";

// Get team data
app.get('/api/team-data', async (req, res) => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const response = await axios.get(url);

    const rows = response.data.split("\n").map(r => r.split(","));
    const headers = rows[0];

    const data = rows.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        obj[h.replace(/"/g, "")] = row[i]?.replace(/"/g, "") || "";
      });
      return obj;
    });

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch team data" });
  }
});

// Save email (in-memory)
app.post('/api/team-member/:name/email', (req, res) => {
  const { name } = req.params;
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required" });
  }

  teamMemberEmails[name] = email;
  res.json({ success: true, message: `Email updated for ${name}` });
});

// Get email
app.get('/api/team-member/:name/email', (req, res) => {
  const { name } = req.params;

  if (!teamMemberEmails[name]) {
    return res.status(404).json({ error: "No email found" });
  }

  res.json({ email: teamMemberEmails[name] });
});

// Send manual reminder
app.post('/api/send-manual-reminder', async (req, res) => {
  try {
    const { teamMember, project, deadline, daysUntilDeadline, customMessage } = req.body;

    const email = teamMemberEmails[teamMember];
    if (!email) {
      return res.status(404).json({ error: `No email found for ${teamMember}` });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Manual Reminder: ${project}`,
      text: customMessage || `Reminder for ${project}. Deadline: ${deadline}`
    };

    await emailTransporter.sendMail(mailOptions);

    sentEmails.push({
      teamMember,
      project,
      type: "manual",
      date: new Date().toISOString().split("T")[0]
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// EXPORT APP (IMPORTANT!)
module.exports = app;
