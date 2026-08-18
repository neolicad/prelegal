import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MyDocuments from "./MyDocuments";

vi.mock("@/lib/api", () => ({
  listSavedDocuments: vi.fn(),
}));

const { listSavedDocuments } = await import("@/lib/api");

describe("MyDocuments", () => {
  it("shows an empty state with a link to start a document", async () => {
    vi.mocked(listSavedDocuments).mockResolvedValue([]);
    render(<MyDocuments />);

    expect(await screen.findByText(/haven.t created any documents yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start one" })).toHaveAttribute("href", "/");
  });

  it("lists saved documents, each linking to its resume URL", async () => {
    vi.mocked(listSavedDocuments).mockResolvedValue([
      { id: 7, slug: "mutual-nda", title: "Acme Inc. & Foo Corp — Mutual NDA", createdAt: "2026-08-01 12:00:00" },
    ]);
    render(<MyDocuments />);

    const link = await screen.findByRole("link", { name: /Acme Inc\. & Foo Corp/ });
    expect(link).toHaveAttribute("href", "/documents/mutual-nda?documentId=7");
  });

  it("shows an error message when loading fails", async () => {
    vi.mocked(listSavedDocuments).mockRejectedValue(new Error("network error"));
    render(<MyDocuments />);

    expect(await screen.findByText("Couldn't load your documents. Please try again.")).toBeInTheDocument();
  });
});
