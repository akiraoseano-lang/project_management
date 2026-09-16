export interface User {
    id: number,
    name: string,
    email: string,
    role: string
}

export interface LoginRequest {
    email: string,
    password: string
}

export interface RegisterRequest {
    name: string,
    email: string,
    password: string
}

export interface AuthResponse {
    message: string,
    user?: User
}