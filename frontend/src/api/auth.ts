import { api } from "./client";
import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    User
} from "../types/auth";

export const getMe = async (): Promise<User> => {
    return api<User>("/auth/me");
}

export const login = async (
    data: LoginRequest
): Promise<AuthResponse> => {
    return api<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export const register = async (
    data: RegisterRequest
): Promise<AuthResponse> => {
    return api<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data)
    });
}

export const logout = async (): Promise<AuthResponse> => {
    return api<AuthResponse>("/auth/logout", {
        method: "POST",
    });
}

export const refreshToken = async (): Promise<AuthResponse> => {
    return api<AuthResponse>("/auth/refresh", {
        method: "POST",
        skipRefresh: true
    });
}

export const loginWithGoogle = (): void => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
}

export const loginWithGithub = (): void => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
}

export const loginWithDiscord = (): void => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/discord`;
}