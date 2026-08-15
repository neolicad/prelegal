import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppHeader from "./AppHeader";

vi.mock("@/lib/api", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ email: "alice@example.com" }),
  logout: vi.fn().mockResolvedValue(undefined),
  navigateFullPage: (path: string) => {
    window.location.href = path;
  },
}));

const { logout } = await import("@/lib/api");

function stubLocation() {
  const location = { href: "" };
  Object.defineProperty(window, "location", { value: location, writable: true });
  return location;
}

describe("AppHeader", () => {
  afterEach(() => {
    vi.mocked(logout).mockClear();
  });

  it("shows the signed-in user's email once loaded", async () => {
    stubLocation();
    render(<AppHeader />);

    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
  });

  it("links to New Document and My Documents", () => {
    stubLocation();
    render(<AppHeader />);

    expect(screen.getByRole("link", { name: "New Document" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "My Documents" })).toHaveAttribute("href", "/my-documents");
  });

  it("signs out and navigates to /login when Sign out is clicked", async () => {
    const location = stubLocation();
    const user = userEvent.setup();
    render(<AppHeader />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(logout).toHaveBeenCalled();
    expect(location.href).toBe("/login");
  });
});
