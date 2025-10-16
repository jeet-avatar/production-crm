"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const twilio_service_1 = require("../services/twilio.service");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Enable authentication for all activity routes
router.use(auth_1.authenticate);
// GET /api/activities - Get all activities
router.get('/', async (req, res, next) => {
    try {
        const { contactId, type, page = '1', limit = '20' } = req.query;
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build where clause with user isolation
        const where = {
            userId: req.user?.id, // Only show activities owned by this user
        };
        if (contactId) {
            where.contactId = contactId;
        }
        if (type && type !== '') {
            where.type = type;
        }
        // Get activities with relations
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
        // Get total count
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
// GET /api/activities/contacts/:contactId - Get activities for specific contact
router.get('/contacts/:contactId', async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const userId = req.user.id;
        // CRITICAL: Verify contact belongs to this user (data isolation)
        const contact = await prisma.contact.findFirst({
            where: {
                id: contactId,
                userId, // ✅ Data isolation maintained
            },
        });
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        // Get activities for this contact with userId filter
        const activities = await prisma.activity.findMany({
            where: {
                contactId,
                userId, // ✅ Data isolation maintained
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
        // Return empty array if no activities (NOT 404)
        res.json({ activities });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/activities - Create new activity
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
// POST /api/activities/:id/send-sms - Send SMS via Twilio
router.post('/:id/send-sms', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { phoneNumber, message } = req.body;
        const userId = req.user.id;
        // Validate inputs
        if (!phoneNumber || !message) {
            throw new errorHandler_1.AppError('Phone number and message are required', 400);
        }
        // Verify activity belongs to user
        const activity = await prisma.activity.findFirst({
            where: { id, userId },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('Activity not found', 404);
        }
        // Send SMS via Twilio
        const twilioService = new twilio_service_1.TwilioService();
        const smsResult = await twilioService.sendSMS(phoneNumber, message);
        // Update activity with SMS metadata
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
// POST /api/activities/:id/send-email - Send email via SMTP
router.post('/:id/send-email', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { to, cc, bcc, subject, htmlContent, textContent } = req.body;
        const userId = req.user.id;
        // Validate inputs
        if (!to || !Array.isArray(to) || to.length === 0) {
            throw new errorHandler_1.AppError('At least one recipient email is required', 400);
        }
        if (!subject || !htmlContent) {
            throw new errorHandler_1.AppError('Subject and email content are required', 400);
        }
        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        // Verify activity belongs to user
        const activity = await prisma.activity.findFirst({
            where: { id, userId },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('Activity not found', 404);
        }
        // Send email
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
        // Update activity with email metadata
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
// POST /api/activities/:id/create-meeting - Create Google Meet meeting
router.post('/:id/create-meeting', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, startTime, endTime, attendees, location, timezone } = req.body;
        const userId = req.user.id;
        // Validate inputs
        if (!title || !startTime || !endTime) {
            throw new errorHandler_1.AppError('Title, start time, and end time are required', 400);
        }
        if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
            throw new errorHandler_1.AppError('At least one attendee email is required', 400);
        }
        // Get user with Google tokens
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        // Note: For now, we'll create the activity without Google Calendar integration
        // Users will need to authorize Google Calendar access first
        // TODO: Implement Google OAuth flow
        // Verify activity belongs to user
        const activity = await prisma.activity.findFirst({
            where: { id, userId },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('Activity not found', 404);
        }
        // For now, create a meeting link placeholder
        // In production, this would call GoogleCalendarService
        const meetingLink = `https://meet.google.com/${Math.random().toString(36).substring(7)}`;
        // Update activity with meeting metadata
        const updatedActivity = await prisma.activity.update({
            where: { id },
            data: {
                type: 'MEETING',
                meetingLink: meetingLink,
                meetingStartTime: new Date(startTime),
                meetingEndTime: new Date(endTime),
                meetingAttendees: attendees,
                meetingLocation: location || 'Online',
                meetingTimezone: timezone || 'America/New_York',
                subject: title,
                description: description || '',
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
            message: 'Meeting created successfully',
            activity: updatedActivity,
            note: 'Google Calendar integration requires OAuth authorization. Meeting link is a placeholder.',
        });
    }
    catch (error) {
        next(error);
    }
});
// PUT /api/activities/:id/complete - Mark task as complete
router.put('/:id/complete', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Verify activity belongs to user
        const activity = await prisma.activity.findFirst({
            where: { id, userId },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('Activity not found', 404);
        }
        // Update activity as completed
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
// GET /api/activities/:id/sms-status - Check SMS delivery status
router.get('/:id/sms-status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Verify activity belongs to user
        const activity = await prisma.activity.findFirst({
            where: { id, userId, type: 'SMS' },
        });
        if (!activity) {
            throw new errorHandler_1.AppError('SMS activity not found', 404);
        }
        if (!activity.smsSid) {
            throw new errorHandler_1.AppError('No SMS SID found for this activity', 400);
        }
        // Get SMS status from Twilio
        const twilioService = new twilio_service_1.TwilioService();
        const status = await twilioService.getSMSStatus(activity.smsSid);
        // Update activity with latest status
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
exports.default = router;
