import { describe, it, expect, mock, beforeEach } from "bun:test";
import { TRPCError } from "@trpc/server";

// ─── Mock setup (must happen before importing the service) ────────────────────

const userFindUnique = mock();
const userCreate = mock();
const userUpdate = mock();
const userFindFirst = mock();
const rtCreate = mock();
const rtFindUnique = mock();
const rtDelete = mock();
const rtDeleteMany = mock();

mock.module("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
      create: userCreate,
      update: userUpdate,
      findFirst: userFindFirst,
    },
    refreshToken: {
      create: rtCreate,
      findUnique: rtFindUnique,
      delete: rtDelete,
      deleteMany: rtDeleteMany,
    },
  },
}));

mock.module("../../lib/jwt", () => ({
  signAccessToken: mock(() => "mock-access-token"),
  signRefreshToken: mock(() => "mock-refresh-token"),
  verifyRefreshToken: mock(() => ({ userId: "user-1", role: "USER" as const })),
}));

const mockSendResetEmail = mock(() => Promise.resolve());
mock.module("../../lib/email", () => ({ sendPasswordResetEmail: mockSendResetEmail }));

mock.module("bcryptjs", () => ({
  default: {
    hash: mock(() => Promise.resolve("hashed-password")),
    compare: mock(() => Promise.resolve(true)),
  },
}));

// Dynamic import after all mocks are registered
const { authService } = await import("../auth.service");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: "user-1",
  email: "user@example.com",
  name: "Alice",
  passwordHash: "hashed-password",
  role: "USER" as const,
  avatar: null,
  bio: null,
  resetPasswordToken: null,
  resetPasswordExpiry: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshTokens: [],
};

const mockRefreshToken = {
  id: "rt-1",
  token: "mock-refresh-token",
  userId: "user-1",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  createdAt: new Date(),
};

function resetAllMocks() {
  userFindUnique.mockReset();
  userCreate.mockReset();
  userUpdate.mockReset();
  userFindFirst.mockReset();
  rtCreate.mockReset();
  rtFindUnique.mockReset();
  rtDelete.mockReset();
  rtDeleteMany.mockReset();
  mockSendResetEmail.mockReset();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("authService.register", () => {
  beforeEach(resetAllMocks);

  it("creates a user and returns tokens", async () => {
    userFindUnique.mockResolvedValue(null);
    userCreate.mockResolvedValue(mockUser);
    rtCreate.mockResolvedValue(mockRefreshToken);

    const result = await authService.register("user@example.com", "password123");

    expect(result).toEqual({ accessToken: "mock-access-token", refreshToken: "mock-refresh-token" });
    expect(userCreate.mock.calls[0][0].data.email).toBe("user@example.com");
  });

  it("throws CONFLICT when email already exists", async () => {
    userFindUnique.mockResolvedValue(mockUser);

    expect(authService.register("user@example.com", "password123")).rejects.toThrow(TRPCError);
    await expect(authService.register("user@example.com", "password123")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("authService.login", () => {
  beforeEach(resetAllMocks);

  it("returns tokens for valid credentials", async () => {
    userFindUnique.mockResolvedValue(mockUser);
    rtCreate.mockResolvedValue(mockRefreshToken);

    const result = await authService.login("user@example.com", "password123");

    expect(result).toEqual({ accessToken: "mock-access-token", refreshToken: "mock-refresh-token" });
  });

  it("throws UNAUTHORIZED when email is not found", async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(authService.login("ghost@example.com", "password123")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws UNAUTHORIZED when password is wrong", async () => {
    userFindUnique.mockResolvedValue(mockUser);
    // Override bcrypt compare to return false for this test
    const bcrypt = await import("bcryptjs");
    const compareSpy = mock(() => Promise.resolve(false));
    (bcrypt.default as { compare: typeof compareSpy }).compare = compareSpy;

    await expect(authService.login("user@example.com", "wrongpassword")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("authService.logout", () => {
  beforeEach(resetAllMocks);

  it("deletes the refresh token and returns success", async () => {
    rtDeleteMany.mockResolvedValue({ count: 1 });

    const result = await authService.logout("some-refresh-token");

    expect(result).toEqual({ success: true });
    expect(rtDeleteMany.mock.calls[0][0]).toMatchObject({ where: { token: "some-refresh-token" } });
  });

  it("succeeds even when token does not exist (idempotent)", async () => {
    rtDeleteMany.mockResolvedValue({ count: 0 });

    const result = await authService.logout("nonexistent-token");
    expect(result).toEqual({ success: true });
  });
});

describe("authService.refresh", () => {
  beforeEach(resetAllMocks);

  it("rotates the token and returns new tokens", async () => {
    rtFindUnique.mockResolvedValue(mockRefreshToken);
    rtDelete.mockResolvedValue(mockRefreshToken);
    userFindUnique.mockResolvedValue(mockUser);
    rtCreate.mockResolvedValue({ ...mockRefreshToken, token: "new-refresh-token" });

    const result = await authService.refresh("mock-refresh-token");

    expect(result).toEqual({ accessToken: "mock-access-token", refreshToken: "mock-refresh-token" });
    expect(rtDelete.mock.calls.length).toBe(1); // old token deleted
  });

  it("throws UNAUTHORIZED when token is not in the database", async () => {
    rtFindUnique.mockResolvedValue(null);

    await expect(authService.refresh("unknown-token")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws UNAUTHORIZED when token is expired", async () => {
    const expiredToken = { ...mockRefreshToken, expiresAt: new Date(Date.now() - 1000) };
    rtFindUnique.mockResolvedValue(expiredToken);
    rtDelete.mockResolvedValue(expiredToken);

    await expect(authService.refresh("expired-token")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("authService.forgotPassword", () => {
  beforeEach(resetAllMocks);

  it("sends a reset email and returns success when user exists", async () => {
    userFindUnique.mockResolvedValue(mockUser);
    userUpdate.mockResolvedValue(mockUser);
    mockSendResetEmail.mockResolvedValue(undefined);

    const result = await authService.forgotPassword("user@example.com");

    expect(result).toEqual({ success: true });
    expect(mockSendResetEmail.mock.calls.length).toBe(1);
    expect(mockSendResetEmail.mock.calls[0][0]).toBe("user@example.com");
  });

  it("returns success without sending email when user does not exist (no enumeration)", async () => {
    userFindUnique.mockResolvedValue(null);

    const result = await authService.forgotPassword("ghost@example.com");

    expect(result).toEqual({ success: true });
    expect(mockSendResetEmail.mock.calls.length).toBe(0);
  });
});

describe("authService.resetPassword", () => {
  beforeEach(resetAllMocks);

  it("updates the password and clears the token", async () => {
    userFindFirst.mockResolvedValue(mockUser);
    userUpdate.mockResolvedValue(mockUser);
    rtDeleteMany.mockResolvedValue({ count: 1 });

    const result = await authService.resetPassword("valid-token", "newpassword123");

    expect(result).toEqual({ success: true });
    expect(userUpdate.mock.calls[0][0].data).toMatchObject({
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    });
    // All sessions invalidated after password reset
    expect(rtDeleteMany.mock.calls.length).toBe(1);
  });

  it("throws BAD_REQUEST for an invalid or expired token", async () => {
    userFindFirst.mockResolvedValue(null);

    await expect(authService.resetPassword("bad-token", "newpassword123")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

describe("authService.me", () => {
  beforeEach(resetAllMocks);

  it("returns the user's public profile", async () => {
    const publicUser = {
      id: "user-1",
      email: "user@example.com",
      name: "Alice",
      role: "USER" as const,
      avatar: null,
      bio: null,
      createdAt: new Date(),
    };
    userFindUnique.mockResolvedValue(publicUser);

    const result = await authService.me("user-1");

    expect(result.id).toBe("user-1");
    expect(result.email).toBe("user@example.com");
    expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it("throws NOT_FOUND when the user does not exist", async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(authService.me("nonexistent")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
