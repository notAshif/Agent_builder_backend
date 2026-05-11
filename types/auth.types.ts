export interface RegisterRequest {
    email: string;
    password: string;
    name?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        name: string | null;
    };
    access_token: string;
    refresh_token: string;
    expire_at: number | undefined;
}

export interface RefreshRequest {
    refresh_token: string;
}

export interface ForgetPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    password: string;
}
