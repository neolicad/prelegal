import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentChatApiError, postDocumentChatTurn, postDocumentMatchTurn } from "./api";

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
