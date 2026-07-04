import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/app/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

import app from "../src/app";

describe("App routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a root message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Server is running");
  });

  it("returns health status when the database is reachable", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      status: "ok",
      database: "connected",
    });
  });
});
