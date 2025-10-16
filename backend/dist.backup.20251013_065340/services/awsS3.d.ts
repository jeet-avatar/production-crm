import { Readable } from 'stream';
export interface UploadParams {
    bucket: string;
    key: string;
    body: Buffer | Readable | string;
    contentType?: string;
    metadata?: Record<string, string>;
}
export declare function uploadToS3(params: UploadParams): Promise<{
    success: boolean;
    etag: string;
    location: string;
}>;
export declare function getFromS3(bucket: string, key: string): Promise<{
    body: import("@smithy/types").StreamingBlobPayloadOutputTypes;
    contentType: string;
    metadata: Record<string, string>;
}>;
export declare function deleteFromS3(bucket: string, key: string): Promise<{
    success: boolean;
}>;
export declare function listS3Files(bucket: string, prefix?: string): Promise<import("@aws-sdk/client-s3")._Object[]>;
export declare function getPresignedUrl(bucket: string, key: string, expiresIn?: number): Promise<string>;
export declare function getPresignedUploadUrl(bucket: string, key: string, contentType?: string, expiresIn?: number): Promise<string>;
export declare function streamToBuffer(stream: Readable): Promise<Buffer>;
//# sourceMappingURL=awsS3.d.ts.map