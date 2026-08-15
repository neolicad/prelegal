"use client";

import { useMemo, useRef, useState } from "react";
import DocumentChatPanel from "./DocumentChatPanel";
import DocumentForm from "./DocumentForm";
import DocumentPreview from "./DocumentPreview";
import { defaultFormValues, getPartyValue, type DocumentFormValues } from "@/lib/document-form";
import { renderDocument, type DocumentTemplates } from "@/lib/render-document";
import { slugify } from "@/lib/slugify";
import type { DocumentTypeSpec } from "@/lib/document-types";

interface DocumentAppProps {
  spec: DocumentTypeSpec;
  templates: DocumentTemplates;
}

export default function DocumentApp({ spec, templates }: DocumentAppProps) {
  const [values, setValues] = useState<DocumentFormValues>(() => defaultFormValues(spec));
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const documentMarkdown = useMemo(
    () => renderDocument(spec, templates, values),
    [spec, templates, values]
  );

  async function handleDownload() {
    if (!previewRef.current) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const partySlugs = spec.parties.map((party) => slugify(getPartyValue(values, party.key).company));
      const filename = `${[...partySlugs, spec.slug].join("-")}.pdf`;
      await html2pdf()
        .set({
          margin: 0.5,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .from(previewRef.current)
        .save();
    } catch (error) {
      console.error("Failed to generate document PDF", error);
      setDownloadError("Something went wrong generating the PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[110rem] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-8">
      <section className="lg:w-1/3">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">{spec.name} Creator</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Chat with the assistant, or fill in the form — either fills in the document on the right
            as you go.
          </p>
        </header>
        <DocumentChatPanel spec={spec} values={values} onValuesChange={setValues} />
      </section>

      <section className="lg:w-1/3">
        <header className="mb-6">
          <p className="mt-2 text-sm text-neutral-600">
            Based on the{" "}
            <a
              className="underline underline-offset-2 hover:text-neutral-900"
              href="https://commonpaper.com"
              target="_blank"
              rel="noreferrer"
            >
              Common Paper {spec.name}
            </a>{" "}
            standard, free to use under CC BY 4.0.
          </p>
        </header>
        <DocumentForm spec={spec} values={values} onChange={setValues} />
      </section>

      <section className="lg:w-1/3">
        <div className="flex flex-col gap-4 lg:sticky lg:top-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloading ? "Preparing PDF…" : "Download PDF"}
            </button>
            {downloadError ? <p className="text-sm text-red-600">{downloadError}</p> : null}
          </div>
          <DocumentPreview ref={previewRef} markdown={documentMarkdown} />
        </div>
      </section>
    </div>
  );
}
