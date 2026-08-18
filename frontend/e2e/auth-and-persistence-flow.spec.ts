import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers";

test.describe("Signup, login, and logout", () => {
  test("signs up, signs out, and signs back in with the same credentials", async ({ page }) => {
    const email = await signUpNewUser(page);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("hunter2hunter2");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "What do you need to create?" })).toBeVisible();
  });

  test("rejects an unknown email on sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("whatever1");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("rejects a duplicate email on sign up", async ({ page }) => {
    const email = await signUpNewUser(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    // Sign-out's own redirect to /login is a client-side window.location.href
    // navigation racing with the next line's goto() otherwise -- wait for it
    // to land first, or one navigation can abort the other.
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("someotherpassword");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("An account with that email already exists")).toBeVisible();
  });
});

test.describe("Document history", () => {
  test("saves a downloaded document to My Documents and resumes editing it from there", async ({ page }) => {
    await signUpNewUser(page);

    await page.getByRole("link", { name: /^Cloud Service Agreement/ }).click();
    await page.getByLabel("Governing Law", { exact: false }).fill("Delaware");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    await downloadPromise;

    await page.getByRole("navigation").getByRole("link", { name: "My Documents" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "My Documents" })).toBeVisible();
    const savedLink = page.getByRole("link", { name: /Cloud Service Agreement/ });
    await expect(savedLink).toBeVisible();

    await savedLink.click();
    await expect(page.getByRole("heading", { level: 1, name: "Cloud Service Agreement Creator" })).toBeVisible();
    await expect(page.getByLabel("Governing Law", { exact: false })).toHaveValue("Delaware");
  });

  test("shows an empty state before any document has been saved", async ({ page }) => {
    await signUpNewUser(page);

    await page.getByRole("link", { name: "My Documents" }).click();

    await expect(page.getByText(/haven.t created any documents yet/)).toBeVisible();
  });
});
