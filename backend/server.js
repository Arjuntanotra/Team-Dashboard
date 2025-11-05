const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to your preferred email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Google Sheet configuration (same as frontend)
const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";
const SHEET_NAME = "Sheet1";

// Initialize SQLite database
const db = new sqlite3.Database('./team_dashboard.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');

    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS team_member_emails (
      name TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sent_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_member TEXT NOT NULL,
      project TEXT NOT NULL,
      email_type TEXT NOT NULL, -- 'manual' or 'automatic'
      days_until_deadline INTEGER,
      sent_date DATE DEFAULT CURRENT_DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_member, project, sent_date)
    )`);
  }
});

// In-memory storage for team member emails (in production, use a database)
let teamMemberEmails = {};

// API Routes

// Get team data from Google Sheets
app.get('/api/team-data', async (req, res) => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const response = await axios.get(url);
    const csvText = response.data;

    // Parse CSV data (simplified version)
    const rows = csvText.split('\n').map(row => row.split(','));
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.replace(/"/g, '')] = row[index]?.replace(/"/g, '') || '';
      });
      return obj;
    });

    res.json(data);
  } catch (error) {
    console.error('Error fetching team data:', error);
    res.status(500).json({ error: 'Failed to fetch team data' });
  }
});

// Update team member email
app.post('/api/team-member/:name/email', (req, res) => {
  const { name } = req.params;
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  // Update both in-memory cache and database
  teamMemberEmails[name] = email;

  db.run(`INSERT OR REPLACE INTO team_member_emails (name, email, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
    [name, email], function(err) {
      if (err) {
        console.error('Error saving email to database:', err);
        return res.status(500).json({ error: 'Failed to save email' });
      }
      res.json({ success: true, message: `Email updated for ${name}` });
    });
});

// Get team member email
app.get('/api/team-member/:name/email', (req, res) => {
  const { name } = req.params;

  // First check in-memory cache
  if (teamMemberEmails[name]) {
    return res.json({ email: teamMemberEmails[name] });
  }

  // Check database
  db.get(`SELECT email FROM team_member_emails WHERE name = ?`, [name], (err, row) => {
    if (err) {
      console.error('Error fetching email from database:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (row) {
      teamMemberEmails[name] = row.email; // Cache it
      res.json({ email: row.email });
    } else {
      res.status(404).json({ error: 'Email not found for this team member' });
    }
  });
});



// Send manual reminder email
app.post('/api/send-manual-reminder', async (req, res) => {
  const { teamMember, project, deadline, daysUntilDeadline, customMessage } = req.body;

  try {
    const email = teamMemberEmails[teamMember];
    if (!email) {
      return res.status(404).json({ error: `No email found for ${teamMember}` });
    }

    // Check if we already sent a manual email today for this team member and project
    const today = new Date().toISOString().split('T')[0];
    const existingEmail = await new Promise((resolve) => {
      db.get(`SELECT id FROM sent_emails WHERE team_member = ? AND project = ? AND sent_date = ? AND email_type = 'manual'`,
        [teamMember, project, today], (err, row) => {
          if (err) {
            console.error('Error checking sent emails:', err);
            resolve(null);
          } else {
            resolve(row);
          }
        });
    });

    if (existingEmail) {
      return res.status(400).json({ error: 'Manual reminder already sent today for this project' });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `📋 Manual Reminder: ${project} Deadline`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📋 Manual Project Reminder</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Sent manually by your manager</p>
          </div>
          <div style="padding: 30px; background: white;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${teamMember}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">Your manager has sent you a manual reminder about your project deadline.</p>

            ${customMessage ? `
              <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">📝 Manager's Message:</h3>
                <p style="color: #4b5563; font-style: italic; margin: 0;">"${customMessage}"</p>
              </div>
            ` : ''}

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Project Details:</h3>
              <ul style="color: #4b5563; padding-left: 20px;">
                <li><strong>Project:</strong> ${project}</li>
                <li><strong>Deadline:</strong> ${deadline}</li>
                <li><strong>Days Remaining:</strong> ${daysUntilDeadline}</li>
              </ul>
            </div>

            <div style="background: ${daysUntilDeadline <= 3 ? '#fef2f2' : '#fefce8'}; border: 1px solid ${daysUntilDeadline <= 3 ? '#fecaca' : '#fde047'}; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: ${daysUntilDeadline <= 3 ? '#dc2626' : '#ca8a04'}; font-weight: bold;">
                ${daysUntilDeadline <= 3 ? '🚨 Urgent: Only ' + daysUntilDeadline + ' days remaining!' : '⚠️ Reminder: ' + daysUntilDeadline + ' days until deadline'}
              </p>
            </div>

            <p style="color: #4b5563; line-height: 1.6;">Please ensure all tasks are completed on time. If you need any assistance or have questions, don't hesitate to reach out to your manager.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Dashboard</a>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">This manual reminder was sent by your manager from the Team Dashboard system.</p>
          </div>
        </div>
      `
    };

    await emailTransporter.sendMail(mailOptions);

    // Record the sent email in database
    db.run(`INSERT INTO sent_emails (team_member, project, email_type, days_until_deadline, sent_date) VALUES (?, ?, 'manual', ?, ?)`,
      [teamMember, project, daysUntilDeadline, today], function(err) {
        if (err) {
          console.error('Error recording sent email:', err);
        }
      });

    res.json({ success: true, message: `Manual reminder sent to ${teamMember}` });
  } catch (error) {
    console.error('Error sending manual reminder:', error);
    res.status(500).json({ error: 'Failed to send manual reminder email' });
  }
});

// Send reminder email (automatic)
app.post('/api/send-reminder', async (req, res) => {
  const { teamMember, project, deadline, daysUntilDeadline } = req.body;

  try {
    const email = teamMemberEmails[teamMember];
    if (!email) {
      return res.status(404).json({ error: `No email found for ${teamMember}` });
    }

    // Check if we already sent any email today for this team member and project
    const today = new Date().toISOString().split('T')[0];
    const existingEmail = await new Promise((resolve) => {
      db.get(`SELECT id FROM sent_emails WHERE team_member = ? AND project = ? AND sent_date = ?`,
        [teamMember, project, today], (err, row) => {
          if (err) {
            console.error('Error checking sent emails:', err);
            resolve(null);
          } else {
            resolve(row);
          }
        });
    });

    if (existingEmail) {
      return res.json({ success: true, message: `Email already sent today to ${teamMember} for ${project}` });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `⏰ Project Deadline Reminder: ${project}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📅 Project Deadline Reminder</h1>
          </div>
          <div style="padding: 30px; background: white;">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${teamMember}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">This is a friendly reminder about your upcoming project deadline.</p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Project Details:</h3>
              <ul style="color: #4b5563; padding-left: 20px;">
                <li><strong>Project:</strong> ${project}</li>
                <li><strong>Deadline:</strong> ${deadline}</li>
                <li><strong>Days Remaining:</strong> ${daysUntilDeadline}</li>
              </ul>
            </div>

            <div style="background: ${daysUntilDeadline <= 3 ? '#fef2f2' : '#fefce8'}; border: 1px solid ${daysUntilDeadline <= 3 ? '#fecaca' : '#fde047'}; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: ${daysUntilDeadline <= 3 ? '#dc2626' : '#ca8a04'}; font-weight: bold;">
                ${daysUntilDeadline <= 3 ? '🚨 Urgent: Only ' + daysUntilDeadline + ' days remaining!' : '⚠️ Reminder: ' + daysUntilDeadline + ' days until deadline'}
              </p>
            </div>

            <p style="color: #4b5563; line-height: 1.6;">Please ensure all tasks are completed on time. If you need any assistance or have questions, don't hesitate to reach out to your manager.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Dashboard</a>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">This reminder was sent automatically by the Team Dashboard system.</p>
          </div>
        </div>
      `
    };

    await emailTransporter.sendMail(mailOptions);

    // Record the sent email in database
    db.run(`INSERT INTO sent_emails (team_member, project, email_type, days_until_deadline, sent_date) VALUES (?, ?, 'automatic', ?, ?)`,
      [teamMember, project, daysUntilDeadline, today], function(err) {
        if (err) {
          console.error('Error recording sent email:', err);
        }
      });

    res.json({ success: true, message: `Reminder sent to ${teamMember}` });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder email' });
  }
});

// Scheduled job to check for upcoming deadlines and send reminders
cron.schedule('0 9 * * *', async () => { // Run daily at 9 AM
  console.log('Checking for upcoming deadlines...');

  try {
    // Fetch team data
    const response = await axios.get(`http://localhost:${PORT}/api/team-data`);
    const teamData = response.data;

    // Check for tasks with upcoming deadlines
    const today = new Date();
    const reminderThresholds = [1, 3, 7]; // Send reminders 1, 3, and 7 days before deadline

    for (const row of teamData) {
      const deadlineStr = row.Deadline || row.DueDate;
      const teamMember = row.TeamMember || row.Member || row.Name;
      const project = row.Project || row.ProjectName;
      const status = (row.Status || '').toLowerCase();

      if (!deadlineStr || deadlineStr === 'N/A' || !teamMember || !project) continue;
      if (status.includes('completed') || status.includes('done')) continue; // Skip completed tasks

      try {
        const deadline = parseDate(deadlineStr);
        if (!deadline) continue;

        const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

        // Send reminder if deadline is within threshold and we haven't sent one recently
        if (reminderThresholds.includes(daysUntilDeadline) && teamMemberEmails[teamMember]) {
          console.log(`Sending reminder to ${teamMember} for ${project} (${daysUntilDeadline} days remaining)`);

          await axios.post(`http://localhost:${PORT}/api/send-reminder`, {
            teamMember,
            project,
            deadline: deadlineStr,
            daysUntilDeadline
          });
        }
      } catch (dateError) {
        console.error(`Error parsing date for ${teamMember}:`, dateError);
      }
    }
  } catch (error) {
    console.error('Error in scheduled reminder check:', error);
  }
});

// Helper function to parse dates (same as frontend)
function parseDate(dateStr) {
  if (!dateStr || dateStr === "N/A" || dateStr === "-") return null;
  try {
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/");
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  } catch {
    return null;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Team Dashboard Backend Server running on port ${PORT}`);
  console.log(`📧 Email service: ${emailTransporter.options.service || 'Configured'}`);
  console.log(`⏰ Daily reminder check scheduled for 9:00 AM`);
});

module.exports = app;
