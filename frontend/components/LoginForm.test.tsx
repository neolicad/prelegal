import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";

// jsdom doesn't implement real navigation, so `window.location.href = ...`
// throws "Not implemented" unless location is replaced with a plain object.
function stubLocation() {
  const location = { href: "" };
  Object.defineProperty(window, "location", { value: location, writable: true });
  return location;
}

describe("LoginForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("signs in and navigates into the app on valid credentials", async () => {
    const location = stubLocation();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ email: "alice@example.com" }) })
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(location.href).toBe("/");
  });

  it("shows the server's error message and does not navigate on bad credentials", async () => {
    const location = stubLocation();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: "Invalid email or password" }),
      })
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
    expect(location.href).toBe("");
  });

  it("requires both fields before submitting", async () => {
    stubLocation();
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });

  it("links to the signup page", () => {
    stubLocation();
    render(<LoginForm />);

    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
  });
});
