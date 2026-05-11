export interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
}

export interface UpdateProfileRequest {
    name?: string;
}

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    lastTime: Date | null;
    createAt: Date;
}

export interface CreateApiKeyRequest {
    name: string;
}

export interface ApiKeyResponse {
    id: string;
    name: string;
    key: string;
    createAt: Date;
}
