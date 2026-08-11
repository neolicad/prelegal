"use client";

import { useMemo, useRef, useState } from "react";
import NdaForm from "./NdaForm";
import NdaPreview from "./NdaPreview";
import { defaultFormValues, type NdaFormValues } from "@/lib/nda-form";
import { renderNdaDocument } from "@/lib/render-nda";
import { slugify } from "@/lib/slugify";

interface NdaAppProps {
  coverPageTemplate: string;
  standardTermsTemplate: string;
}

export default function NdaApp({ coverPageTemplate, standardTermsTemplate }: NdaAppProps) {
  const [values, setValues] = useState<NdaFormValues>(defaultFormValues);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const documentMarkdown = useMemo(
    () => renderNdaDocument(coverPageTemplate, standardTermsTemplate, values),
    [coverPageTemplate, standardTermsTemplate, values]
  );

  async function handleDownload() {
    if (!previewRef.current) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = `${slugify(values.party1.company)}-${slugify(values.party2.company)}-mutual-nda.pdf`;
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
      console.error("Failed to generate NDA PDF", error);
      setDownloadError("Something went wrong generating the PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row lg:px-8">
      <section className="lg:w-1/2">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-neutral-900">Mutual NDA Creator</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Fill in the details below — the document on the right updates as you type. Based on the{" "}
            <a
              className="underline underline-offset-2 hover:text-neutral-900"
              href="https://commonpaper.com/standards/mutual-nda/1.0/"
              target="_blank"
              rel="noreferrer"
            >
              Common Paper Mutual NDA
            </a>{" "}
            standard, free to use under CC BY 4.0.
          </p>
        </header>
        <NdaForm values={values} onChange={setValues} />
      </section>

      <section className="lg:w-1/2">
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
          <NdaPreview ref={previewRef} markdown={documentMarkdown} />
        </div>
      </section>
    </div>
  );
}
