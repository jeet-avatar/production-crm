import type { calendar_v3 } from 'googleapis';
export interface MeetingOptions {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    location?: string;
    timezone?: string;
}
export declare class GoogleCalendarService {
    private oauth2Client;
    private calendar;
    constructor(accessToken: string, refreshToken: string);
    createMeeting(options: MeetingOptions): Promise<{
        id: string;
        summary: string;
        description: string;
        start: string;
        end: string;
        meetLink: string;
        htmlLink: string;
        status: string;
        attendees: {
            email: string;
            responseStatus: string;
        }[];
    }>;
    updateEvent(eventId: string, updates: Partial<MeetingOptions>): Promise<calendar_v3.Schema$Event>;
    deleteEvent(eventId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getEvent(eventId: string): Promise<calendar_v3.Schema$Event>;
    listUpcomingEvents(maxResults?: number): Promise<calendar_v3.Schema$Event[]>;
    static generateAuthUrl(): string;
    static getTokensFromCode(code: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiryDate: number;
    }>;
}
//# sourceMappingURL=google-calendar.service.d.ts.map