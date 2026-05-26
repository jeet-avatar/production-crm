"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoomUserService = void 0;
const axios_1 = __importDefault(require("axios"));
class ZoomUserService {
    constructor(accessToken, refreshToken, userId) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.userId = userId;
        if (!accessToken || !refreshToken || !userId) {
            throw new Error('Zoom user OAuth credentials are required (accessToken, refreshToken, userId)');
        }
    }
    async refreshAccessToken() {
        try {
            const clientId = process.env.ZOOM_USER_CLIENT_ID;
            const clientSecret = process.env.ZOOM_USER_CLIENT_SECRET;
            if (!clientId || !clientSecret) {
                throw new Error('Zoom User OAuth credentials not configured');
            }
            const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            const response = await axios_1.default.post('https://zoom.us/oauth/token', `grant_type=refresh_token&refresh_token=${this.refreshToken}`, {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            this.accessToken = response.data.access_token;
            if (response.data.refresh_token) {
                this.refreshToken = response.data.refresh_token;
            }
            return this.accessToken;
        }
        catch (error) {
            console.error('Zoom Token Refresh Error:', error.response?.data || error.message);
            throw new Error(`Failed to refresh Zoom access token: ${error.response?.data?.message || error.message}`);
        }
    }
    async makeRequest(config) {
        try {
            config.headers = {
                ...config.headers,
                'Authorization': `Bearer ${this.accessToken}`,
            };
            return await (0, axios_1.default)(config);
        }
        catch (error) {
            if (error.response?.status === 401) {
                await this.refreshAccessToken();
                config.headers.Authorization = `Bearer ${this.accessToken}`;
                return await (0, axios_1.default)(config);
            }
            throw error;
        }
    }
    async createMeeting(options) {
        try {
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
            const response = await this.makeRequest({
                method: 'POST',
                url: `https://api.zoom.us/v2/users/${this.userId}/meetings`,
                data: meetingData,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const meeting = response.data;
            console.log(`[Zoom User Meeting Created] ID: ${meeting.id}, User: ${this.userId}`);
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
            await this.makeRequest({
                method: 'PATCH',
                url: `https://api.zoom.us/v2/meetings/${meetingId}`,
                data: updateData,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            console.log(`[Zoom User Meeting Updated] ID: ${meetingId}`);
        }
        catch (error) {
            console.error('Zoom Update Meeting Error:', error.response?.data || error.message);
            throw new Error(`Failed to update Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }
    async deleteMeeting(meetingId) {
        try {
            await this.makeRequest({
                method: 'DELETE',
                url: `https://api.zoom.us/v2/meetings/${meetingId}`,
            });
            console.log(`[Zoom User Meeting Deleted] ID: ${meetingId}`);
        }
        catch (error) {
            console.error('Zoom Delete Meeting Error:', error.response?.data || error.message);
            throw new Error(`Failed to delete Zoom meeting: ${error.response?.data?.message || error.message}`);
        }
    }
    async getMeeting(meetingId) {
        try {
            const response = await this.makeRequest({
                method: 'GET',
                url: `https://api.zoom.us/v2/meetings/${meetingId}`,
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
    getAccessToken() {
        return this.accessToken;
    }
    getRefreshToken() {
        return this.refreshToken;
    }
}
exports.ZoomUserService = ZoomUserService;
//# sourceMappingURL=zoom-user.service.js.map