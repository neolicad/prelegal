import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DocumentChatApiError,
  getSavedDocument,
  listSavedDocuments,
  login,
  logout,
  postDocumentChatTurn,
  postDocumentMatchTurn,
  saveDocument,
  signup,
} from "./api";
import { setFakeAiEnabled } from "./fake-ai";

describe("postDocumentChatTurn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the message, history, and current values to the document type's chat endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ reply: "Hi!", updates: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await postDocumentChatTurn("csa", "Hello", [{ role: "user", content: "Hi" }], { governingLaw: "" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/documents/csa/chat",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Hello",
          history: [{ role: "user", content: "Hi" }],
          values: { governingLaw: "" },
        }),
      })
    );
  });

  it("resolves with the reply and updates on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ reply: "Got it.", updates: { governingLaw: "Delaware" } }),
      })
    );

    const result = await postDocumentChatTurn("mutual-nda", "Delaware", [], {});

    expect(result).toEqual({ reply: "Got it.", updates: { governingLaw: "Delaware" } });
  });

  it("throws DocumentChatApiError on a non-OK, non-401 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    await expect(postDocumentChatTurn("mutual-nda", "Hello", [], {})).rejects.toThrow(DocumentChatApiError);
  });

  it("redirects to /login and throws on a 401 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    // jsdom logs (but doesn't throw on) unimplemented navigation -- assert
    // the redirect via the assigned href rather than an actual page load.
    Object.defineProperty(window, "location", { writable: true, value: { href: "" } });

    await expect(postDocumentChatTurn("mutual-nda", "Hello", [], {})).rejects.toThrow(DocumentChatApiError);
    expect(window.location.href).toBe("/login");
  });
});

describe("postDocumentMatchTurn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the message and history to the match endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ matchedSlug: "csa", reply: "Sounds like a CSA." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await postDocumentMatchTurn("I sell SaaS", []);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/documents/match",
      expect.objectContaining({ body: JSON.stringify({ message: "I sell SaaS", history: [] }) })
    );
    expect(result).toEqual({ matchedSlug: "csa", reply: "Sounds like a CSA." });
  });
});

describe("auth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("login does not redirect on a 401, and surfaces the server's error detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: "Invalid email or password" }),
      })
    );
    Object.defineProperty(window, "location", { writable: true, value: { href: "" } });

    await expect(login("a@example.com", "wrong")).rejects.toThrow("Invalid email or password");
    expect(window.location.href).toBe("");
  });

  it("signup posts email and password to /api/auth/signup", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ email: "a@example.com" }) });
    vi.stubGlobal("fetch", fetchMock);

    await signup("a@example.com", "hunter2");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({ body: JSON.stringify({ email: "a@example.com", password: "hunter2" }) })
    );
  });

  it("logout posts to /api/auth/logout", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    await logout();

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }));
  });
});

describe("saved documents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saveDocument posts slug and values to /api/documents", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, slug: "mutual-nda", title: "x", createdAt: "" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await saveDocument("mutual-nda", { governingLaw: "Delaware" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/documents",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ slug: "mutual-nda", values: { governingLaw: "Delaware" } }),
      })
    );
  });

  it("listSavedDocuments GETs /api/documents", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) });
    vi.stubGlobal("fetch", fetchMock);

    await listSavedDocuments();

    expect(fetchMock).toHaveBeenCalledWith("/api/documents", expect.objectContaining({ method: "GET" }));
  });

  it("getSavedDocument GETs /api/documents/{id}", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 7, slug: "mutual-nda", title: "x", createdAt: "", values: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await getSavedDocument(7);

    expect(fetchMock).toHaveBeenCalledWith("/api/documents/7", expect.objectContaining({ method: "GET" }));
  });
});

describe("fake AI header", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setFakeAiEnabled(false);
  });

  it("is omitted when fake AI mode is disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    await postDocumentChatTurn("mutual-nda", "Hi", [], {});

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers).not.toHaveProperty("x-prelegal-fake-ai");
  });

  it("is attached to chat requests when fake AI mode is enabled", async () => {
    setFakeAiEnabled(true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    await postDocumentChatTurn("mutual-nda", "Hi", [], {});

    expect(fetchMock.mock.calls[0][1].headers).toEqual(
      expect.objectContaining({ "x-prelegal-fake-ai": "1" })
    );
  });

  it("is attached to match requests when fake AI mode is enabled", async () => {
    setFakeAiEnabled(true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", fetchMock);

    await postDocumentMatchTurn("Hi", []);

    expect(fetchMock.mock.calls[0][1].headers).toEqual(
      expect.objectContaining({ "x-prelegal-fake-ai": "1" })
    );
  });
});
