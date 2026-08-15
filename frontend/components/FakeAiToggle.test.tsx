import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FakeAiToggle from "./FakeAiToggle";
import { isFakeAiEnabled, setFakeAiEnabled } from "@/lib/fake-ai";

describe("FakeAiToggle", () => {
  afterEach(() => {
    setFakeAiEnabled(false);
  });

  it("is unchecked by default", () => {
    render(<FakeAiToggle />);

    expect(screen.getByRole("checkbox", { name: /Fake AI/ })).not.toBeChecked();
  });

  it("reflects a previously-enabled state on mount", () => {
    setFakeAiEnabled(true);

    render(<FakeAiToggle />);

    expect(screen.getByRole("checkbox", { name: /Fake AI/ })).toBeChecked();
  });

  it("persists the choice to storage when toggled on", async () => {
    const user = userEvent.setup();
    render(<FakeAiToggle />);

    await user.click(screen.getByRole("checkbox", { name: /Fake AI/ }));

    expect(screen.getByRole("checkbox", { name: /Fake AI/ })).toBeChecked();
    expect(isFakeAiEnabled()).toBe(true);
  });

  it("persists the choice to storage when toggled back off", async () => {
    setFakeAiEnabled(true);
    const user = userEvent.setup();
    render(<FakeAiToggle />);

    await user.click(screen.getByRole("checkbox", { name: /Fake AI/ }));

    expect(screen.getByRole("checkbox", { name: /Fake AI/ })).not.toBeChecked();
    expect(isFakeAiEnabled()).toBe(false);
  });
});
