"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
const googleapis_1 = require("googleapis");
class GoogleCalendarService {
    constructor(accessToken, refreshToken) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
        if (!clientId || !clientSecret) {
            throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
        }
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        this.calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
    async createMeeting(options) {
        try {
            const event = await this.calendar.events.insert({
                calendarId: 'primary',
                conferenceDataVersion: 1,
                requestBody: {
                    summary: options.summary,
                    description: options.description,
                    location: options.location || 'Online',
                    start: {
                        dateTime: options.startTime.toISOString(),
                        timeZone: options.timezone || 'America/New_York',
                    },
                    end: {
                        dateTime: options.endTime.toISOString(),
                        timeZone: options.timezone || 'America/New_York',
                    },
                    attendees: options.attendees.map(email => ({ email })),
                    conferenceData: {
                        createRequest: {
                            requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                            conferenceSolutionKey: { type: 'hangoutsMeet' },
                        },
                    },
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'email', minutes: 24 * 60 },
                            { method: 'popup', minutes: 30 },
                        ],
                    },
                },
            });
            const data = event.data;
            return {
                id: data.id,
                summary: data.summary,
                description: data.description,
                start: data.start?.dateTime,
                end: data.end?.dateTime,
                meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri || '',
                htmlLink: data.htmlLink,
                status: data.status,
                attendees: data.attendees?.map(a => ({
                    email: a.email,
                    responseStatus: a.responseStatus,
                })) || [],
            };
        }
        catch (error) {
            console.error('Google Calendar Error:', error);
            throw new Error(`Failed to create meeting: ${error.message}`);
        }
    }
    async updateEvent(eventId, updates) {
        try {
            const updateData = {};
            if (updates.summary)
                updateData.summary = updates.summary;
            if (updates.description)
                updateData.description = updates.description;
            if (updates.location)
                updateData.location = updates.location;
            if (updates.startTime) {
                updateData.start = {
                    dateTime: updates.startTime.toISOString(),
                    timeZone: updates.timezone || 'America/New_York',
                };
            }
            if (updates.endTime) {
                updateData.end = {
                    dateTime: updates.endTime.toISOString(),
                    timeZone: updates.timezone || 'America/New_York',
                };
            }
            if (updates.attendees) {
                updateData.attendees = updates.attendees.map(email => ({ email }));
            }
            const event = await this.calendar.events.update({
                calendarId: 'primary',
                eventId,
                requestBody: updateData,
            });
            return event.data;
        }
        catch (error) {
            console.error('Google Calendar Update Error:', error);
            throw new Error(`Failed to update event: ${error.message}`);
        }
    }
    async deleteEvent(eventId) {
        try {
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId,
            });
            return { success: true, message: 'Event deleted successfully' };
        }
        catch (error) {
            console.error('Google Calendar Delete Error:', error);
            throw new Error(`Failed to delete event: ${error.message}`);
        }
    }
    async getEvent(eventId) {
        try {
            const event = await this.calendar.events.get({
                calendarId: 'primary',
                eventId,
            });
            return event.data;
        }
        catch (error) {
            console.error('Google Calendar Get Event Error:', error);
            throw new Error(`Failed to get event: ${error.message}`);
        }
    }
    async listUpcomingEvents(maxResults = 10) {
        try {
            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults,
                singleEvents: true,
                orderBy: 'startTime',
            });
            return response.data.items || [];
        }
        catch (error) {
            console.error('Google Calendar List Error:', error);
            throw new Error(`Failed to list events: ${error.message}`);
        }
    }
    static generateAuthUrl() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
        if (!clientId || !clientSecret) {
            throw new Error('Google OAuth credentials not configured');
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ];
        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
        });
    }
    static async getTokensFromCode(code) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const { tokens } = await oauth2Client.getToken(code);
        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
        };
    }
}
exports.GoogleCalendarService = GoogleCalendarService;
//# sourceMappingURL=google-calendar.service.js.map