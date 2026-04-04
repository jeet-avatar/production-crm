"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoomService = void 0;
const axios_1 = __importDefault(require("axios"));
class ZoomService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
        this.clientId = process.env.ZOOM_CLIENT_ID || '';
        this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
        if (!this.accountId || !this.clientId || !this.clientSecret) {
            throw new Error('Zoom credentials not configured. Please set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in .env');
        }
    }
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }
        try {
            const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            const response = await axios_1.default.post(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`, {}, {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            this.accessToken = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600;
            this.tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000);
            return this.accessToken;
        }
        catch (error) {
            console.error('Zoom OAuth Error:', error.response?.data || error.message);
            throw new Error(`Failed to get Zoom access token: ${error.response?.data?.message || error.message}`);
        }
    }
    async getDefaultUser() {
        return 'me';
    }
    async createMeeting(options) {
        try {
            const accessToken = await this.getAccessToken();
            const userId = await this.getDefaultUser();
            const startTime = options.startTime.toISOString();
            const meetingData = {
                topic: options.topic,
                type: 2,
                start_time: startTime,
                duration: options.duration,
                timezone: options.timezone || 'America/New_York',
                agenda: options.agenda || '',
                password: options.password || this.generatePassword(),
                settings: {
                    host_video: options.settings?.hostVideo ?? true,
                    participant_video: options.settings?.participantVideo ?? true,
                    join_before_host: options.settings?.joinBeforeHost ?? true,
                    mute_upon_entry: options.settings?.muteUponEntry ?? false,
                    waiting_room: options.settings?.waitingRoom ?? false,
                    auto_recording: options.settings?.autoRecording || 'none',
                    approval_type: 2,
                    audio: 'both',
                    use_pmi: false,
                },
            };
            const response = await axios_1.default.post(`https://api.zoom.us/v2/users/${userId}/meetings`, meetingData, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const meeting = response.data;
            return {
                id: meeting.id,
                hostId: meeting.host_id,
                topic: meeting.topic,
                agenda: meeting.agenda || '',
                startTime: meeting.start_time,
                duration: meeting.duration,
                timezone: meeting.timezone,
                joinUrl: meeting.join_url,
                password: meeting.password || meeting.encrypted_password || '',
                startUrl: meeting.start_url,
                settings: {
                    hostVideo: meeting.settings.host_video,
                    participantVideo: meeting.settings.participant_video,
                    joinBeforeHost: meeting.settings.join_before_host,
                    muteUponEntry: meeting.settings.mute_upon_entry,
                    waitingRoom: meeting.settings.waiting_room,
                    autoRecording: meeting.settings.auto_recording,
                },
            };
        }
        catch (error) {
            console.error('Zoom Create Meeting Error:', error.response?.data || error.message);
            throw new Error(`Failed to create Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }
    async updateMeeting(meetingId, options) {
        try {
            const accessToken = await this.getAccessToken();
            const updateData = {};
            if (options.topic)
                updateData.topic = options.topic;
            if (options.agenda)
                updateData.agenda = options.agenda;
            if (options.startTime)
                updateData.start_time = options.startTime.toISOString();
            if (options.duration)
                updateData.duration = options.duration;
            if (options.timezone)
                updateData.timezone = options.timezone;
            if (options.password)
                updateData.password = options.password;
            if (options.settings) {
                updateData.settings = {
                    host_video: options.settings.hostVideo,
                    participant_video: options.settings.participantVideo,
                    join_before_host: options.settings.joinBeforeHost,
                    mute_upon_entry: options.settings.muteUponEntry,
                    waiting_room: options.settings.waitingRoom,
                    auto_recording: options.settings.autoRecording,
                };
            }
            await axios_1.default.patch(`https://api.zoom.us/v2/meetings/${meetingId}`, updateData, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
        }
        catch (error) {
            console.error('Zoom Update Meeting Error:', error.response?.data || error.message);
            throw new Error(`Failed to update Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }
    async deleteMeeting(meetingId) {
        try {
            const accessToken = await this.getAccessToken();
            await axios_1.default.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
        }
        catch (error) {
            console.error('Zoom Delete Meeting Error:', error.response?.data || error.message);
            throw new Error(`Failed to delete Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }
    async getMeeting(meetingId) {
        try {
            const accessToken = await this.getAccessToken();
            const response = await axios_1.default.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            const meeting = response.data;
            return {
                id: meeting.id,
                hostId: meeting.host_id,
                topic: meeting.topic,
                agenda: meeting.agenda || '',
                startTime: meeting.start_time,
                duration: meeting.duration,
                timezone: meeting.timezone,
                joinUrl: meeting.join_url,
                password: meeting.password || meeting.encrypted_password || '',
                startUrl: meeting.start_url,
                settings: {
                    hostVideo: meeting.settings.host_video,
                    participantVideo: meeting.settings.participant_video,
                    joinBeforeHost: meeting.settings.join_before_host,
                    muteUponEntry: meeting.settings.mute_upon_entry,
                    waitingRoom: meeting.settings.waiting_room,
                    autoRecording: meeting.settings.auto_recording,
                },
            };
        }
        catch (error) {
            console.error('Zoom Get Meeting Error:', error.response?.data || error.message);
            throw new Error(`Failed to get Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }
    generatePassword() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async testConnection() {
        try {
            const accessToken = await this.getAccessToken();
            await axios_1.default.get('https://api.zoom.us/v2/users/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            return true;
        }
        catch (error) {
            console.error('Zoom Connection Test Failed:', error.response?.data || error.message);
            return false;
        }
    }
}
exports.ZoomService = ZoomService;
//# sourceMappingURL=zoom.service.js.map