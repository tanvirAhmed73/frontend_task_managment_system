export type AuthUserRole = "ADMIN" | "USER";

export type AuthUserView = {
  id: string;
  email: string;
  role: AuthUserRole;
  name: string | null;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUserView;
};

export type CreateUserBody = {
  email: string;
  password: string;
  name?: string;
  role?: AuthUserRole;
};

export type AdminHealthResponse = {
  ok: boolean;
  scope: string;
};
