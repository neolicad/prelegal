# Mutual NDA Creator

A prototype [Next.js](https://nextjs.org) app for the Prelegal platform ([PL-6](https://neolicad.atlassian.net/browse/PL-6)). Fill in a form and get back a completed [Common Paper Mutual NDA](https://commonpaper.com/standards/mutual-nda/1.0/), rendered live and downloadable as a PDF.

The app reads the Standard Terms and Cover Page templates directly from `../templates/` (added in [PL-5](https://neolicad.atlassian.net/browse/PL-5)) and fills them in with the submitted form values — no data is stored or sent anywhere; everything happens in the browser.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## How it works

- `app/page.tsx` — Server Component that reads the two markdown templates from the repo's `templates/` directory.
- `lib/render-nda.ts` — interpolates form values into the templates (Purpose, Effective Date, MNDA Term, Term of Confidentiality, Governing Law, Jurisdiction, Modifications, and both parties' signature block details).
- `components/NdaApp.tsx` — owns form state and renders the form + a live preview side by side; the same preview DOM is captured into a PDF via `html2pdf.js` on download.

## Testing

```bash
npm run test        # unit + component tests (Vitest + React Testing Library)
npm run test:watch  # same, in watch mode
npm run test:e2e    # end-to-end (Playwright) — requires `npx playwright install chromium` once
```

- `lib/*.test.ts` — exercises `render-nda.ts` against the real templates in `../templates/`, including regression tests for two bugs found in review: raw `<label>` tags leaking into the rendered markdown, and `String.replace()`'s special `$&`/`$$` handling corrupting user-typed text.
- `components/*.test.tsx` — form interactions, live preview updates, and the PDF download flow (with `html2pdf.js` mocked, since it's a browser-only library).
- `e2e/nda-flow.spec.ts` — drives the real app in Chromium against a production build, fills the form (including adversarial input), and downloads and inspects an actual generated PDF. Note: `html2pdf.js` rasterizes the page into images rather than embedding real text, so the PDF itself is checked structurally (valid header, page count, file size) — content correctness is asserted against the live preview DOM before download.
