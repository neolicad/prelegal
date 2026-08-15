"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "./Button";
import DocumentChatPanel from "./DocumentChatPanel";
import DocumentForm from "./DocumentForm";
import DocumentPreview from "./DocumentPreview";
import { getSavedDocument, saveDocument } from "@/lib/api";
import { defaultFormValues, getPartyValue, type DocumentFormValues } from "@/lib/document-form";
import { renderDocument, type DocumentTemplates } from "@/lib/render-document";
import { slugify } from "@/lib/slugify";
import { errorTextClass } from "@/lib/ui";
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

  // Resuming a saved document (see MyDocuments.tsx) passes its id via a query
  // param rather than a dynamic route segment, since this page is statically
  // exported per-slug at build time with no per-document id known yet.
  useEffect(() => {
    const documentId = new URLSearchParams(window.location.search).get("documentId");
    if (!documentId) return;
    getSavedDocument(Number(documentId))
      .then((saved) => {
        if (saved.slug === spec.slug) setValues(saved.values);
      })
      .catch(() => {
        // Not this user's document, or it no longer exists -- start fresh.
      });
    // Only ever read on mount: this pre-fills the initial edit, it shouldn't
    // re-run and clobber in-progress edits on later renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const documentMarkdown = useMemo(
    () => renderDocument(spec, templates, values),
    [spec, templates, values]
  );

  async function handleDownload() {
    if (!previewRef.current) return;

    setIsDownloading(true);
    setDownloadError(null);

    // Saving is best-effort and shouldn't block the download the user asked
    // for -- kept as its own try/catch, separate from PDF generation below,
    // so a save failure surfaces via downloadError without skipping it.
    try {
      await saveDocument(spec.slug, values);
    } catch (error) {
      console.error("Failed to save document to history", error);
      setDownloadError("Downloaded, but couldn't save this document to My Documents.");
    }

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
          <h1 className="text-2xl font-semibold text-brand-navy">{spec.name} Creator</h1>
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
            <Button type="button" onClick={() => void handleDownload()} disabled={isDownloading} className="self-start">
              {isDownloading ? "Preparing PDF…" : "Download PDF"}
            </Button>
            {downloadError ? <p className={errorTextClass}>{downloadError}</p> : null}
          </div>
          <p className="text-xs text-brand-gray">
            This is a draft only. Downloading also saves it to{" "}
            <a href="/my-documents" className="underline hover:text-brand-navy">
              My Documents
            </a>
            .
          </p>
          <DocumentPreview ref={previewRef} markdown={documentMarkdown} />
        </div>
      </section>
    </div>
  );
}
