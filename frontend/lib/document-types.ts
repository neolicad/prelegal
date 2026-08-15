import fs from "node:fs/promises";
import path from "node:path";

/**
 * Mirrors backend/app/document_types.py's DocumentTypeSpec. Both sides parse
 * the same repo-root catalog.json (see PL-9) rather than hand-authoring a
 * schema per document type on each side.
 */

export type FieldKind = "text" | "textarea" | "choice";

export interface FieldChoice {
  value: string;
  label: string;
}

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  helpText?: string;
  default?: string;
  choices?: FieldChoice[];
}

export interface PartyRoleSpec {
  key: string;
  label: string;
}

export type DocumentRenderer = "nda-coverpage" | "generic-keyterms";

export interface DocumentTypeSpec {
  slug: string;
  name: string;
  description: string;
  renderer: DocumentRenderer;
  standardTermsFilename: string;
  coverPageFilename?: string;
  parties: PartyRoleSpec[];
  fields: FieldSpec[];
}

interface Catalog {
  documentTypes: DocumentTypeSpec[];
}

// Repo root is one level up from the Next.js app (see PL-5), matching the
// path convention app/page.tsx already uses for reading templates/.
function repoRootPath(...segments: string[]): string {
  return path.join(process.cwd(), "..", ...segments);
}

async function readCatalog(): Promise<Catalog> {
  const raw = await fs.readFile(repoRootPath("catalog.json"), "utf8");
  return JSON.parse(raw) as Catalog;
}

export async function listDocumentTypes(): Promise<DocumentTypeSpec[]> {
  const catalog = await readCatalog();
  return catalog.documentTypes;
}

export async function getDocumentType(slug: string): Promise<DocumentTypeSpec> {
  const spec = (await listDocumentTypes()).find((type) => type.slug === slug);
  if (!spec) throw new Error(`Unknown document type: ${slug}`);
  return spec;
}

export async function readTemplateFile(relativeFilename: string): Promise<string> {
  return fs.readFile(repoRootPath(relativeFilename), "utf8");
}
