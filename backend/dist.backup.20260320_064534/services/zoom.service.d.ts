export interface ZoomMeetingOptions {
    topic: string;
    agenda?: string;
    startTime: Date;
    duration: number;
    timezone?: string;
    password?: string;
    settings?: {
        hostVideo?: boolean;
        participantVideo?: boolean;
        joinBeforeHost?: boolean;
        muteUponEntry?: boolean;
        waitingRoom?: boolean;
        autoRecording?: 'local' | 'cloud' | 'none';
    };
}
export interface ZoomMeetingResponse {
    id: string | number;
    hostId: string;
    topic: string;
    agenda: string;
    startTime: string;
    duration: number;
    timezone: string;
    joinUrl: string;
    password: string;
    startUrl: string;
    settings: {
        hostVideo: boolean;
        participantVideo: boolean;
        joinBeforeHost: boolean;
        muteUponEntry: boolean;
        waitingRoom: boolean;
        autoRecording: string;
    };
}
export declare class ZoomService {
    private accountId;
    private clientId;
    private clientSecret;
    private accessToken;
    private tokenExpiry;
    constructor();
    private getAccessToken;
    private getDefaultUser;
    createMeeting(options: ZoomMeetingOptions): Promise<ZoomMeetingResponse>;
    updateMeeting(meetingId: string | number, options: Partial<ZoomMeetingOptions>): Promise<void>;
    deleteMeeting(meetingId: string | number): Promise<void>;
    getMeeting(meetingId: string | number): Promise<ZoomMeetingResponse>;
    private generatePassword;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=zoom.service.d.ts.map