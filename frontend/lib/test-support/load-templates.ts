import fs from "node:fs";
import path from "node:path";

/**
 * Loads the real Mutual NDA templates from the repo's templates/ directory
 * (added in PL-5). Shared by lib/render-nda.test.ts and
 * components/NdaApp.test.tsx so both exercise render-nda.ts against actual,
 * CC-licensed template content rather than synthetic fixtures.
 */
export function loadNdaTemplates() {
  const templatesDir = path.join(process.cwd(), "..", "templates");
  return {
    coverPageTemplate: fs.readFileSync(path.join(templatesDir, "mutual-nda-coverpage.md"), "utf8"),
    standardTermsTemplate: fs.readFileSync(path.join(templatesDir, "mutual-nda.md"), "utf8"),
  };
}
