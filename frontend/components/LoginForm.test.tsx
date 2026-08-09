import { beforeEach, describe, expect, it } from "vitest";
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
  beforeEach(() => {
    document.cookie = "prelegal_session=; path=/; max-age=0";
  });

  it("accepts any credentials, sets the session cookie, and navigates into the app", async () => {
    const location = stubLocation();
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "alice@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(document.cookie).toContain("prelegal_session=1");
    expect(location.href).toBe("/");
  });

  it("requires both fields before submitting", async () => {
    stubLocation();
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });
});
