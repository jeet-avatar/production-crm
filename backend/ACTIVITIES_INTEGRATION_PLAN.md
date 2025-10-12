# Activities Integration Plan

## Overview
Implement full functionality for the Activities page with integrations for:
- **SMS**: Twilio for sending messages
- **Email**: Individual user email sending
- **Meetings**: Google Meet integration
- **Calendar**: Google Calendar sync
- **Tasks**: Automatic task creation from activities

## Current State Analysis

### Database Schema (Activity Model)
```prisma
model Activity {
  id          String       @id @default(cuid())
  type        ActivityType // CALL, EMAIL, MEETING, TASK, NOTE, SMS, SOCIAL, OTHER
  subject     String
  description String?
  dueDate     DateTime?
  completedAt DateTime?
  isCompleted Boolean      @default(false)
  priority    String       @default("MEDIUM")
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  contactId String?
  dealId    String?
  userId    String

  contact Contact?
  deal    Deal?
  user    User
}
```

### Backend API (activities.ts)
- ✅ GET /api/activities - List all activities
- ✅ GET /api/activities/contacts/:contactId - Get activities for contact
- ✅ POST /api/activities - Create activity
- ❌ PUT /api/activities/:id/send-sms - **MISSING**
- ❌ PUT /api/activities/:id/send-email - **MISSING**
- ❌ PUT /api/activities/:id/create-meeting - **MISSING**
- ❌ PUT /api/activities/:id/complete - **MISSING**

### Frontend (ActivitiesPage.tsx)
- ✅ Activity listing with filters
- ✅ Timeline view
- ✅ Add activity modal (UI only)
- ❌ Action buttons (Send SMS, Send Email, Schedule Meeting) - **MISSING**
- ❌ Integration with Twilio, Gmail, Google Meet - **MISSING**

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Add Activity Metadata Fields
```prisma
model Activity {
  // ... existing fields ...

  // SMS Metadata
  smsTo          String?   // Phone number
  smsFrom        String?   // Twilio phone number
  smsSid         String?   // Twilio message SID
  smsStatus      String?   // sent, delivered, failed
  smsSentAt      DateTime?

  // Email Metadata
  emailTo        String[]? // Array of recipient emails
  emailFrom      String?   // Sender email
  emailCc        String[]?
  emailBcc       String[]?
  emailMessageId String?   // SMTP message ID
  emailStatus    String?   // sent, delivered, opened
  emailSentAt    DateTime?

  // Meeting Metadata
  meetingLink    String?   // Google Meet link
  meetingEventId String?   // Google Calendar event ID
  meetingStartTime DateTime?
  meetingEndTime DateTime?
  meetingAttendees String[]?
  meetingLocation  String?

  // Task Metadata
  taskAssignedTo String?   // User ID
  taskStatus     String?   // todo, in_progress, done
  taskCheckbox   Boolean @default(false)

  // Generic metadata for extensibility
  metadata       Json?
}
```

### Phase 2: Twilio SMS Integration

#### 2.1 Install Dependencies
```bash
npm install twilio
npm install @types/twilio --save-dev
```

#### 2.2 Environment Variables
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### 2.3 Create Twilio Service
**File**: `/src/services/twilio.service.ts`
```typescript
import twilio from 'twilio';

export class TwilioService {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  async sendSMS(to: string, body: string) {
    const message = await this.client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to
    });
    return message;
  }

  async getSMSStatus(messageSid: string) {
    const message = await this.client.messages(messageSid).fetch();
    return message.status;
  }
}
```

#### 2.4 Add SMS Endpoint to Activities Route
**File**: `/src/routes/activities.ts`
```typescript
// POST /api/activities/:id/send-sms
router.post('/:id/send-sms', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phoneNumber, message } = req.body;
    const userId = req.user!.id;

    // Verify activity belongs to user
    const activity = await prisma.activity.findFirst({
      where: { id, userId }
    });

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    // Send SMS via Twilio
    const twilioService = new TwilioService();
    const smsResult = await twilioService.sendSMS(phoneNumber, message);

    // Update activity with SMS metadata
    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        type: 'SMS',
        smsTo: phoneNumber,
        smsFrom: process.env.TWILIO_PHONE_NUMBER,
        smsSid: smsResult.sid,
        smsStatus: smsResult.status,
        smsSentAt: new Date(),
        description: message
      }
    });

    res.json({
      success: true,
      activity: updatedActivity,
      sms: smsResult
    });
  } catch (error) {
    next(error);
  }
});
```

### Phase 3: Email Integration

#### 3.1 Create Email Service for Individual Users
**File**: `/src/services/email.service.ts`
```typescript
import nodemailer from 'nodemailer';

export class EmailService {
  async sendEmail(options: {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text?: string;
  }) {
    // Use existing Gmail SMTP configuration
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: options.from,
      to: options.to.join(', '),
      cc: options.cc?.join(', '),
      bcc: options.bcc?.join(', '),
      subject: options.subject,
      html: options.html,
      text: options.text
    });

    return info;
  }
}
```

#### 3.2 Add Email Endpoint
```typescript
// POST /api/activities/:id/send-email
router.post('/:id/send-email', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { to, cc, bcc, subject, htmlContent, textContent } = req.body;
    const userId = req.user!.id;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Verify activity
    const activity = await prisma.activity.findFirst({
      where: { id, userId }
    });

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    // Send email
    const emailService = new EmailService();
    const emailResult = await emailService.sendEmail({
      from: `${user.firstName} ${user.lastName} <${user.email}>`,
      to,
      cc,
      bcc,
      subject,
      html: htmlContent,
      text: textContent
    });

    // Update activity
    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        type: 'EMAIL',
        emailTo: to,
        emailFrom: user.email,
        emailCc: cc,
        emailBcc: bcc,
        emailMessageId: emailResult.messageId,
        emailStatus: 'sent',
        emailSentAt: new Date(),
        subject: subject,
        description: textContent || htmlContent
      }
    });

    res.json({
      success: true,
      activity: updatedActivity,
      email: emailResult
    });
  } catch (error) {
    next(error);
  }
});
```

### Phase 4: Google Meet & Calendar Integration

#### 4.1 Install Dependencies
```bash
npm install googleapis
npm install @types/googleapis --save-dev
```

#### 4.2 Environment Variables
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

#### 4.3 Create Google Calendar Service
**File**: `/src/services/google-calendar.service.ts`
```typescript
import { google } from 'googleapis';

export class GoogleCalendarService {
  private oauth2Client;
  private calendar;

  constructor(accessToken: string, refreshToken: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async createMeeting(options: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
  }) {
    const event = await this.calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: options.summary,
        description: options.description,
        start: {
          dateTime: options.startTime.toISOString(),
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: options.endTime.toISOString(),
          timeZone: 'America/New_York'
        },
        attendees: options.attendees.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      }
    });

    return event.data;
  }

  async updateEvent(eventId: string, updates: any) {
    const event = await this.calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: updates
    });
    return event.data;
  }

  async deleteEvent(eventId: string) {
    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId
    });
  }
}
```

#### 4.4 Add Meeting Creation Endpoint
```typescript
// POST /api/activities/:id/create-meeting
router.post('/:id/create-meeting', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, startTime, endTime, attendees } = req.body;
    const userId = req.user!.id;

    // Get user with Google tokens (need to store these)
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Verify activity
    const activity = await prisma.activity.findFirst({
      where: { id, userId }
    });

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    // Create Google Meet meeting
    // Note: User needs to authorize Google Calendar access first
    const googleCalendar = new GoogleCalendarService(
      user.googleAccessToken,
      user.googleRefreshToken
    );

    const meeting = await googleCalendar.createMeeting({
      summary: title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendees
    });

    // Update activity
    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        type: 'MEETING',
        meetingLink: meeting.hangoutLink || meeting.conferenceData?.entryPoints?.[0]?.uri,
        meetingEventId: meeting.id,
        meetingStartTime: new Date(startTime),
        meetingEndTime: new Date(endTime),
        meetingAttendees: attendees,
        subject: title,
        description
      }
    });

    res.json({
      success: true,
      activity: updatedActivity,
      meeting
    });
  } catch (error) {
    next(error);
  }
});
```

### Phase 5: Frontend Updates

#### 5.1 Add Action Buttons to Activities
Update ActivitiesPage.tsx to add action buttons for each activity type:

```typescript
const ActivityActions = ({ activity }: { activity: Activity }) => {
  if (activity.type === 'SMS') {
    return (
      <button onClick={() => handleSendSMS(activity)} className="btn-sm btn-primary">
        Send SMS
      </button>
    );
  }

  if (activity.type === 'EMAIL') {
    return (
      <button onClick={() => handleSendEmail(activity)} className="btn-sm btn-primary">
        Send Email
      </button>
    );
  }

  if (activity.type === 'MEETING') {
    return (
      <button onClick={() => handleCreateMeeting(activity)} className="btn-sm btn-primary">
        Schedule Meeting
      </button>
    );
  }

  if (activity.type === 'TASK') {
    return (
      <button onClick={() => handleCompleteTask(activity)} className="btn-sm btn-secondary">
        Complete Task
      </button>
    );
  }

  return null;
};
```

#### 5.2 Add Send SMS Modal
```typescript
const SendSMSModal = ({ activity, onClose, onSend }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    const token = localStorage.getItem('crmToken');
    const response = await fetch(`http://localhost:3000/api/activities/${activity.id}/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phoneNumber, message })
    });

    if (response.ok) {
      onSend();
      onClose();
    }
  };

  return (
    <Modal>
      <input
        type="tel"
        placeholder="Phone number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />
      <textarea
        placeholder="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSend}>Send SMS</button>
    </Modal>
  );
};
```

## API Keys & Credentials Needed

### 1. Twilio
- Sign up at: https://www.twilio.com
- Get: Account SID, Auth Token, Phone Number
- Add to .env file

### 2. Google Workspace APIs
- Enable Google Calendar API
- Enable Google Meet API
- Get OAuth2 credentials (Client ID, Client Secret)
- Add to .env file
- Implement OAuth2 flow for users to authorize

### 3. SMTP (Already configured)
- Using Gmail SMTP: jeetnair.in@gmail.com
- Password: amvtukbjjdlvaluf

## Testing Plan

1. **Test SMS Sending**
   - Create SMS activity
   - Enter phone number and message
   - Verify SMS sent via Twilio
   - Check activity updated with metadata

2. **Test Email Sending**
   - Create email activity
   - Enter recipients, subject, body
   - Verify email sent from user's email
   - Check activity updated with metadata

3. **Test Meeting Creation**
   - Create meeting activity
   - Schedule meeting with Google Meet
   - Verify calendar event created
   - Check Google Meet link generated
   - Verify attendees receive invite

4. **Test Task Management**
   - Create task activity
   - Complete task
   - Verify status updated
   - Check task appears in completed list

## Deployment Steps

1. Update Prisma schema with new fields
2. Run migration: `npx prisma migrate dev --name add_activity_metadata`
3. Install new dependencies
4. Add environment variables to .env
5. Deploy backend to EC2
6. Deploy frontend to S3
7. Test all integrations on sandbox
8. Send test instructions to Ethan

## Security Considerations

- Store Twilio credentials securely in environment variables
- Never expose API keys in frontend code
- Use OAuth2 for Google APIs (not API keys)
- Validate all user inputs before sending SMS/Email
- Rate limit SMS/Email sending to prevent abuse
- Log all activities for audit trail
- Ensure user isolation (userId check on all operations)

## Future Enhancements

- WhatsApp integration via Twilio
- Slack integration for team notifications
- Microsoft Teams meeting support
- Zoom meeting integration
- Email templates for common messages
- SMS templates
- Automated follow-up reminders
- Activity analytics and reporting
