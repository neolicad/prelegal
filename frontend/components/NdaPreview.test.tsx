import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NdaPreview from "./NdaPreview";

describe("NdaPreview", () => {
  it("renders markdown headings as real heading elements", () => {
    render(<NdaPreview markdown="# Mutual Non-Disclosure Agreement" />);
    expect(screen.getByRole("heading", { level: 1, name: "Mutual Non-Disclosure Agreement" })).toBeInTheDocument();
  });

  it("renders GFM tables (remark-gfm) as real <table> markup", () => {
    const markdown = ["| A | B |", "|---|---|", "| 1 | 2 |"].join("\n");
    render(<NdaPreview markdown={markdown} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1" })).toBeInTheDocument();
  });

  it("renders GFM task list items as checked/unchecked disabled checkboxes", () => {
    const markdown = ["- [x] Checked item", "- [ ] Unchecked item"].join("\n");
    render(<NdaPreview markdown={markdown} />);
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[0]).toBeDisabled();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it("renders bold defined-term markdown as <strong>", () => {
    render(<NdaPreview markdown="This is the **Purpose** of the agreement." />);
    expect(screen.getByText("Purpose", { selector: "strong" })).toBeInTheDocument();
  });

  it("does not render literal <label> text if it ever leaked into the markdown (defense in depth)", () => {
    // render-nda.ts is responsible for converting <label> tags to markdown
    // italics before they reach this component, but since react-markdown
    // escapes raw HTML by default (no rehype-raw plugin), this component
    // itself is a second line of defense: even unconverted <label> markup
    // would render as inert text, never as an interactive label element.
    render(<NdaPreview markdown="<label>hint</label>" />);
    expect(document.querySelector("label")).not.toBeInTheDocument();
  });

  it("forwards the ref to the inner content div", () => {
    const ref = createRef<HTMLDivElement>();
    render(<NdaPreview ref={ref} markdown="# Heading" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("nda-document");
  });
});
