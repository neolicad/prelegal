import fs from "node:fs";
import path from "node:path";
import type { DocumentTemplates } from "../render-document";
import type { DocumentTypeSpec } from "../document-types";

/**
 * Loads a document type's spec plus its real template file(s) from the
 * repo's catalog.json / templates/ directory (see PL-5, PL-9), so tests
 * exercise render-document.ts against actual, CC-licensed content rather
 * than synthetic fixtures.
 */
export function loadDocumentTypeFixture(slug: string): { spec: DocumentTypeSpec; templates: DocumentTemplates } {
  const repoRoot = path.join(process.cwd(), "..");
  const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, "catalog.json"), "utf8"));
  const spec = (catalog.documentTypes as DocumentTypeSpec[]).find((type) => type.slug === slug);
  if (!spec) throw new Error(`Unknown document type: ${slug}`);

  const standardTerms = fs.readFileSync(path.join(repoRoot, spec.standardTermsFilename), "utf8");
  const coverPage = spec.coverPageFilename
    ? fs.readFileSync(path.join(repoRoot, spec.coverPageFilename), "utf8")
    : undefined;

  return { spec, templates: { standardTerms, coverPage } };
}
