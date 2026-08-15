import DocumentPicker from "@/components/DocumentPicker";
import { listDocumentTypes } from "@/lib/document-types";

export default async function Home() {
  const documentTypes = await listDocumentTypes();
  return <DocumentPicker documentTypes={documentTypes} />;
}
