import { notFound } from "next/navigation";
import DocumentApp from "@/components/DocumentApp";
import { getDocumentType, listDocumentTypes, readTemplateFile } from "@/lib/document-types";

export async function generateStaticParams() {
  const documentTypes = await listDocumentTypes();
  return documentTypes.map((spec) => ({ slug: spec.slug }));
}

export default async function DocumentPage({ params }: PageProps<"/documents/[slug]">) {
  const { slug } = await params;

  let spec;
  try {
    spec = await getDocumentType(slug);
  } catch {
    notFound();
  }

  const [standardTerms, coverPage] = await Promise.all([
    readTemplateFile(spec.standardTermsFilename),
    spec.coverPageFilename ? readTemplateFile(spec.coverPageFilename) : Promise.resolve(undefined),
  ]);

  return <DocumentApp spec={spec} templates={{ standardTerms, coverPage }} />;
}
