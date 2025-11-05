# Team Dashboard Backend

This backend provides email reminder functionality for the Team Dashboard application.

## Features

- 📧 Automated email reminders for project deadlines
- 👥 Team member email management
- ⏰ Scheduled daily reminder checks (9 AM)
- 📊 Integration with Google Sheets data
- 🧪 Test email functionality

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Email Settings

#### For Gmail:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Update `.env` file:
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password
```

#### For Other Email Services:
Update the email transporter configuration in `server.js`:
```javascript
const emailTransporter = nodemailer.createTransporter({
  service: 'outlook', // or 'yahoo', 'hotmail', etc.
  auth: {
    user: 'your-email@outlook.com',
    pass: 'your-password'
  }
});
```

### 3. Configure Google Sheets
Update the Google Sheet ID in `.env` if different from the default:
```env
GOOGLE_SHEET_ID=your-google-sheet-id
SHEET_NAME=your-sheet-name
```

### 4. Start the Server
```bash
npm start
```

For development with auto-restart:
```bash
npm install -g nodemon
npm run dev
```

## API Endpoints

### Team Data
- `GET /api/team-data` - Fetch team data from Google Sheets

### Email Management
- `POST /api/team-member/:name/email` - Set email for a team member
- `GET /api/team-member/:name/email` - Get email for a team member

### Email Testing
- `POST /api/test-email` - Send a test email
  ```json
  {
    "to": "recipient@example.com",
    "subject": "Test Subject",
    "message": "Test message content"
  }
  ```

### Reminders
- `POST /api/send-reminder` - Send a manual reminder
  ```json
  {
    "teamMember": "John Doe",
    "project": "Project Alpha",
    "deadline": "15/12/2025",
    "daysUntilDeadline": 3
  }
  ```

### Health Check
- `GET /api/health` - Server health status

## Automated Reminders

The system automatically sends reminders at 9 AM daily for tasks with deadlines in:
- 7 days
- 3 days
- 1 day

Reminders are only sent if:
- Team member has an email configured
- Task is not completed
- Deadline is valid

## Team Member Email Setup

Before reminders can be sent, you need to configure emails for team members:

```bash
# Example: Set email for a team member
curl -X POST http://localhost:5000/api/team-member/John%20Doe/email \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@company.com"}'
```

## Google Sheets Integration

The backend reads from the same Google Sheet as your frontend. Required columns:
- Manager/ManagerName
- TeamMember/Member/Name
- Project/ProjectName
- Task/TaskName
- Status
- Deadline/DueDate
- CompletedDate/ActualDate/CompletionDate

## Security Notes

- Store `.env` file securely and never commit to version control
- Use app passwords instead of main account passwords
- Consider using OAuth2 for production email services
- Add rate limiting for email endpoints in production

## Troubleshooting

### Email Not Sending
1. Check email credentials in `.env`
2. Verify Gmail app password is correct
3. Check spam folder
4. Review server logs for errors

### Google Sheets Access
1. Ensure sheet is publicly accessible
2. Check sheet ID and name in `.env`
3. Verify column names match expected format

### Server Not Starting
1. Check if port 5000 is available
2. Verify all dependencies are installed
3. Check for syntax errors in `server.js`

## Production Deployment

For production deployment:
1. Use environment variables instead of `.env` file
2. Set up proper database for email storage
3. Add error logging and monitoring
4. Configure HTTPS
5. Set up proper email service (SendGrid, AWS SES, etc.)

## Support

If you encounter issues, check the server logs and ensure all configuration steps are completed correctly.
