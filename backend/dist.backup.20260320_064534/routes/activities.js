"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const twilio_service_1 = require("../services/twilio.service");
const email_service_1 = require("../services/email.service");
const google_calendar_service_1 = require("../services/google-calendar.service");
const zoom_service_1 = require("../services/zoom.service");
const zoom_user_service_1 = require("../services/zoom-user.service");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const { contactId, type, page = '1', limit = '20' } = req.query;
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const accountOwnerId = (0, auth_1.getAccountOwnerId)(req);
        const userId = req.user?.id;
        const teamAccessConditions = [
            { userId: userId },
            ...(req.user?.teamRole === 'OWNER' ? [{
                    user: {
                        OR: [
                            { id: accountOwnerId },
                            { accountOwnerId: accountOwnerId }
                        ]
                    }
                }] : []),
            { shares: { some: { userId: userId } } }
        ];
        const where = {
            OR: teamAccessConditions
        };
        if (contactId) {
            where.contactId = contactId;
        }
        if (type && type !== '') {
            where.type = type;
        }
        const activities = await prisma.activity.findMany({
            where,
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                deal: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: limitNum,
        });
        const total = await prisma.activity.count({ where });
        res.json({
            activities,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/contacts/:contactId', async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const userId = req.user.id;
        const contact = await prisma.contact.findFirst({
            where: {
                id: contactId,
                userId,
            },
        });
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        const activities = await prisma.activity.findMany({
            where: {
                contactId,
                userId,
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                deal: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({ activities });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { type = 'NOTE', subject, description, contactId, dealId, dueDate, priority = 'MEDIUM', } = req.body;
        const activity = await prisma.activity.create({
            data: {
                type,
                subject,
                description,
                contactId: contactId || null,
                dealId: dealId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority,
                userId: req.user.id,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                deal: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        res.status(201).json({ activity });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/send-sms', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { phoneNumber, message } = req.body;
        const userId = req.user.id;
        if (!phoneNumber || !message) {
            throw new errorHandler_1.AppError('Phone number and message are required', 400);
        }
        const activity = await prisma.activity.findFirst({
            where: { id, userId },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('Activity not found', 404);
        }
        const twilioService = new twilio_service_1.TwilioService();
        const smsResult = await twilioService.sendSMS(phoneNumber, message);
        const updatedActivity = await prisma.activity.update({
            where: { id },
            data: {
                type: 'SMS',
                smsTo: phoneNumber,
                smsFrom: smsResult.from || process.env.TWILIO_PHONE_NUMBER,
                smsSid: smsResult.sid,
                smsStatus: smsResult.status,
                smsSentAt: new Date(),
                subject: `SMS to ${phoneNumber}`,
                description: message,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        res.json({
            success: true,
            message: 'SMS sent successfully',
            activity: updatedActivity,
            sms: smsResult,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/send-email', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { to, cc, bcc, subject, htmlContent, textContent } = req.body;
        const userId = req.user.id;
        if (!to || !Array.isArray(to) || to.length === 0) {
            throw new errorHandler_1.AppError('At least one recipient email is required', 400);
        }
        if (!subject || !htmlContent) {
            throw new errorHandler_1.AppError('Subject and email content are required', 400);
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        const activity = await prisma.activity.findFirst({
            where: { id, userId },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('Activity not found', 404);
        }
        const emailService = new email_service_1.EmailService();
        const emailResult = await emailService.sendEmail({
            from: `${user.firstName} ${user.lastName} <${user.email}>`,
            to,
            cc,
            bcc,
            subject,
            html: htmlContent,
            text: textContent,
        });
        const updatedActivity = await prisma.activity.update({
            where: { id },
            data: {
                type: 'EMAIL',
                emailTo: to,
                emailFrom: user.email,
                emailCc: cc || [],
                emailBcc: bcc || [],
                emailMessageId: emailResult.messageId,
                emailStatus: 'sent',
                emailSentAt: new Date(),
                subject: subject,
                description: textContent || htmlContent,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        res.json({
            success: true,
            message: 'Email sent successfully',
            activity: updatedActivity,
            email: emailResult,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/create-meeting', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, startTime, endTime, attendees, location, timezone, calendarPlatform = 'google', sendInvitation = false } = req.body;
        const userId = req.user.id;
        if (!title || !startTime || !endTime) {
            throw new errorHandler_1.AppError('Title, start time, and end time are required', 400);
        }
        if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
            throw new errorHandler_1.AppError('At least one attendee email is required', 400);
        }
        const activity = await prisma.activity.findFirst({
            where: { id, userId },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('Activity not found', 404);
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                googleCalendarAccessToken: true,
                googleCalendarRefreshToken: true,
                googleCalendarConnected: true,
                zoomAccessToken: true,
                zoomRefreshToken: true,
                zoomConnected: true,
                zoomUserId: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        let meetingLink = '';
        let meetingPassword = '';
        let calendarEventId = '';
        let meetingPlatform = calendarPlatform;
        const start = new Date(startTime);
        const end = new Date(endTime);
        const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        if (calendarPlatform === 'zoom') {
            if (!user.zoomConnected || !user.zoomRefreshToken || !user.zoomUserId) {
                throw new errorHandler_1.AppError('Please connect your Zoom account in Settings to create Zoom meetings. Go to Settings → Calendar Connections.', 400);
            }
            try {
                const zoomService = new zoom_user_service_1.ZoomUserService(user.zoomAccessToken, user.zoomRefreshToken, user.zoomUserId);
                const zoomMeeting = await zoomService.createMeeting({
                    topic: title,
                    agenda: description || '',
                    startTime: start,
                    duration: durationMinutes,
                    timezone: timezone || 'America/New_York',
                    settings: {
                        hostVideo: true,
                        participantVideo: true,
                        joinBeforeHost: true,
                        muteUponEntry: false,
                        waitingRoom: false,
                        autoRecording: 'none',
                    },
                });
                meetingLink = zoomMeeting.joinUrl;
                meetingPassword = zoomMeeting.password;
                calendarEventId = zoomMeeting.id.toString();
                const newAccessToken = zoomService.getAccessToken();
                if (newAccessToken !== user.zoomAccessToken) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            zoomAccessToken: newAccessToken,
                            zoomRefreshToken: zoomService.getRefreshToken(),
                        },
                    });
                }
                console.log(`[Zoom Meeting Created in USER's Account] User: ${userId}, ID: ${zoomMeeting.id}, Link: ${meetingLink}`);
            }
            catch (error) {
                console.error('[Zoom User Meeting Creation Failed]:', error.message);
                throw new errorHandler_1.AppError(`Failed to create Zoom meeting: ${error.message}`, 500);
            }
        }
        else if (calendarPlatform === 'google') {
            if (!user.googleCalendarConnected || !user.googleCalendarRefreshToken) {
                throw new errorHandler_1.AppError('Please connect your Google Calendar in Settings to create Google Meet meetings. Go to Settings → Calendar Connections.', 400);
            }
            try {
                const calendarService = new google_calendar_service_1.GoogleCalendarService(user.googleCalendarAccessToken, user.googleCalendarRefreshToken);
                const event = await calendarService.createMeeting({
                    summary: title,
                    description: description || '',
                    startTime: start,
                    endTime: end,
                    attendees,
                    location: location || 'Online',
                    timezone: timezone || 'America/New_York',
                });
                meetingLink = event.meetLink;
                calendarEventId = event.id || '';
                meetingPassword = '';
                console.log(`[Google Meet Created in USER's Calendar] User: ${userId}, Link: ${meetingLink}`);
            }
            catch (error) {
                console.error('[Google Calendar Meeting Creation Failed]:', error.message);
                throw new errorHandler_1.AppError(`Failed to create Google Calendar meeting: ${error.message}`, 500);
            }
        }
        else if (calendarPlatform === 'teams') {
            throw new errorHandler_1.AppError('Microsoft Teams integration is not yet available. Please use Google Calendar or Zoom.', 501);
        }
        else {
            throw new errorHandler_1.AppError('Invalid calendar platform. Must be: google, zoom, or teams', 400);
        }
        const updatedActivity = await prisma.activity.update({
            where: { id },
            data: {
                type: 'MEETING',
                meetingLink: meetingLink,
                meetingStartTime: start,
                meetingEndTime: end,
                meetingAttendees: attendees,
                meetingLocation: location || 'Online',
                meetingTimezone: timezone || 'America/New_York',
                subject: title,
                description: `${description || ''}\n\n🔗 Meeting Link: ${meetingLink}${meetingPassword ? `\n🔐 Password: ${meetingPassword}` : ''}`,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        res.json({
            success: true,
            message: `${meetingPlatform.charAt(0).toUpperCase() + meetingPlatform.slice(1)} meeting created successfully`,
            activity: updatedActivity,
            meetingLink: meetingLink,
            meetingPassword: meetingPassword,
            platform: meetingPlatform,
            calendarEventId: calendarEventId,
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id/complete', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const activity = await prisma.activity.findFirst({
            where: { id, userId },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('Activity not found', 404);
        }
        const updatedActivity = await prisma.activity.update({
            where: { id },
            data: {
                isCompleted: true,
                completedAt: new Date(),
                taskStatus: 'done',
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                deal: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        res.json({
            success: true,
            message: 'Activity marked as complete',
            activity: updatedActivity,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id/sms-status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const activity = await prisma.activity.findFirst({
            where: { id, userId, type: 'SMS' },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('SMS activity not found', 404);
        }
        if (!activity.smsSid) {
            throw new errorHandler_1.AppError('No SMS SID found for this activity', 400);
        }
        const twilioService = new twilio_service_1.TwilioService();
        const status = await twilioService.getSMSStatus(activity.smsSid);
        await prisma.activity.update({
            where: { id },
            data: {
                smsStatus: status.status,
            },
        });
        res.json({
            success: true,
            status,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/zoom/test', async (req, res, next) => {
    try {
        const zoomService = new zoom_service_1.ZoomService();
        const isConnected = await zoomService.testConnection();
        res.json({
            success: true,
            connected: isConnected,
            message: isConnected
                ? 'Zoom connection successful'
                : 'Zoom connection failed. Please check your credentials.',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            connected: false,
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=activities.js.map