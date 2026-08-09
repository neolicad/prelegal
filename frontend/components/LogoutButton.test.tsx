import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LogoutButton from "./LogoutButton";

function stubLocation() {
  const location = { href: "" };
  Object.defineProperty(window, "location", { value: location, writable: true });
  return location;
}

describe("LogoutButton", () => {
  it("clears the session cookie and navigates to the login screen", async () => {
    document.cookie = "prelegal_session=1; path=/";
    const location = stubLocation();
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(document.cookie).not.toContain("prelegal_session=1");
    expect(location.href).toBe("/login");
  });
});
