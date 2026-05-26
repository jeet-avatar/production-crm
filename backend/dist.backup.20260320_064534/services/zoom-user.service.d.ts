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
export declare class ZoomUserService {
    private accessToken;
    private refreshToken;
    private userId;
    constructor(accessToken: string, refreshToken: string, userId: string);
    private refreshAccessToken;
    private makeRequest;
    createMeeting(options: ZoomMeetingOptions): Promise<ZoomMeetingResponse>;
    updateMeeting(meetingId: string | number, options: Partial<ZoomMeetingOptions>): Promise<void>;
    deleteMeeting(meetingId: string | number): Promise<void>;
    getMeeting(meetingId: string | number): Promise<ZoomMeetingResponse>;
    private generatePassword;
    getAccessToken(): string;
    getRefreshToken(): string;
}
//# sourceMappingURL=zoom-user.service.d.ts.map