import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupForm from "./SignupForm";

function stubLocation() {
  const location = { href: "" };
  Object.defineProperty(window, "location", { value: location, writable: true });
  return location;
}

describe("SignupForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("signs up and navigates into the app on success", async () => {
    const location = stubLocation();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ email: "alice@example.com" }) })
    );
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2hunter2");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(location.href).toBe("/");
  });

  it("shows the server's error message on a duplicate email", async () => {
    const location = stubLocation();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ detail: "An account with that email already exists" }),
      })
    );
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2hunter2");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("An account with that email already exists")).toBeInTheDocument();
    expect(location.href).toBe("");
  });

  it("links to the login page", () => {
    stubLocation();
    render(<SignupForm />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});
