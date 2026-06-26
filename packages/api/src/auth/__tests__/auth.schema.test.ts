import { describe, it, expect } from "bun:test";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
  logoutSchema,
} from "../auth.schema";

describe("registerSchema", () => {
  it("accepts valid email and password", () => {
    const result = registerSchema.safeParse({ email: "user@example.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("accepts optional name", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      name: "Alice",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({ email: "not-an-email", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ email: "user@example.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = registerSchema.safeParse({ password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = registerSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "anypassword" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "bad", password: "password" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-valid" });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts valid token and password", () => {
    const result = resetPasswordSchema.safeParse({ token: "some-uuid", password: "newpassword" });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = resetPasswordSchema.safeParse({ token: "some-uuid", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects missing token", () => {
    const result = resetPasswordSchema.safeParse({ password: "newpassword" });
    expect(result.success).toBe(false);
  });
});

describe("refreshSchema", () => {
  it("accepts a refresh token string", () => {
    const result = refreshSchema.safeParse({ refreshToken: "some-token" });
    expect(result.success).toBe(true);
  });

  it("rejects missing token", () => {
    const result = refreshSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("logoutSchema", () => {
  it("accepts a refresh token string", () => {
    const result = logoutSchema.safeParse({ refreshToken: "some-token" });
    expect(result.success).toBe(true);
  });
});
