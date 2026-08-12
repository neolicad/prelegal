import { afterEach, describe, expect, it, vi } from "vitest";
import { NdaChatApiError, postNdaChatTurn } from "./api";
import { defaultFormValues } from "./nda-form";

describe("postNdaChatTurn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the message, history, and current values as JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ reply: "Hi!", updates: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await postNdaChatTurn("Hello", [{ role: "user", content: "Hi" }], defaultFormValues);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/nda/chat",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Hello",
          history: [{ role: "user", content: "Hi" }],
          values: defaultFormValues,
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

    const result = await postNdaChatTurn("Delaware", [], defaultFormValues);

    expect(result).toEqual({ reply: "Got it.", updates: { governingLaw: "Delaware" } });
  });

  it("throws NdaChatApiError on a non-OK, non-401 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    await expect(postNdaChatTurn("Hello", [], defaultFormValues)).rejects.toThrow(NdaChatApiError);
  });

  it("redirects to /login and throws on a 401 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    // jsdom logs (but doesn't throw on) unimplemented navigation -- assert
    // the redirect via the assigned href rather than an actual page load.
    Object.defineProperty(window, "location", { writable: true, value: { href: "" } });

    await expect(postNdaChatTurn("Hello", [], defaultFormValues)).rejects.toThrow(NdaChatApiError);
    expect(window.location.href).toBe("/login");
  });
});
