import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("sources router", () => {
  it("should create a new source", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sources.create({
      name: "Test Source",
      type: "website",
      url: "https://example.com",
      description: "A test source",
      crawlInterval: 3600,
    });

    expect(result).toEqual({ success: true });
  });

  it("should list user sources", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sources = await caller.sources.list();
    expect(Array.isArray(sources)).toBe(true);
  });

  it("should reject invalid URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sources.create({
        name: "Invalid Source",
        type: "website",
        url: "not-a-url",
        crawlInterval: 3600,
      })
    ).rejects.toThrow();
  });
});

describe("articles router", () => {
  it("should get article stats", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.articles.stats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("unread");
    expect(stats).toHaveProperty("read");
    expect(stats).toHaveProperty("favorite");
  });

  it("should list articles with filters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const articles = await caller.articles.list({
      status: "unread",
      limit: 10,
      offset: 0,
    });

    expect(Array.isArray(articles)).toBe(true);
  });

  it("should get today's articles", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const todayArticles = await caller.articles.today();
    expect(Array.isArray(todayArticles)).toBe(true);
  });
});

describe("settings router", () => {
  it("should get user settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const settings = await caller.settings.get();
    expect(settings).toBeDefined();
    expect(settings).toHaveProperty("aiEnabled");
    expect(settings).toHaveProperty("notificationEnabled");
  });

  it("should update user settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.update({
      aiEnabled: false,
      notificationEnabled: true,
    });

    expect(result).toEqual({ success: true });
  });
});

describe("tags router", () => {
  it("should create a new tag", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tags.create({
      name: "Test Tag",
      color: "#ff0000",
    });

    expect(result).toEqual({ success: true });
  });

  it("should list user tags", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tags = await caller.tags.list();
    expect(Array.isArray(tags)).toBe(true);
  });
});
