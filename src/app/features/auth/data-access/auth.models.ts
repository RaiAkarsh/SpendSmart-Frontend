// Matches Java User entity exactly.
export interface User {
  userId: number;
  fullName: string;
  email: string;
  passwordHash?: string | null;
  currency: string;
  timezone: string;
  avatarUrl?: string | null;
  provider: string;
  active: boolean;           // Jackson maps boolean isActive → "active" in JSON
  monthlyBudget: number;
  createdAt: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  passwordHash: string;      // backend BCrypt-hashes this on register
  currency: string;
  timezone: string;
  avatarUrl?: string | null;
  provider: string;
  monthlyBudget: number;
}

// POST /auth/login — backend reads credentials.get("email") and credentials.get("password")
export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

// POST /auth/login response — ONLY token + message, no userId.
// userId is decoded from the JWT payload claim.
export interface AuthResponse {
  token: string;
  message: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  avatarUrl?: string | null;
  timezone: string;
}

// PUT /auth/password/{userId} — backend reads body.get("currentPassword") / body.get("newPassword")
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface TokenPayload {
  sub: string;
  userId: number;
  iat: number;
  exp: number;
}
