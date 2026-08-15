"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listSavedDocuments, type SavedDocumentSummary } from "@/lib/api";
import { errorTextClass } from "@/lib/ui";

function formatCreatedAt(sqliteDatetime: string): string {
  // SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" in UTC with no
  // timezone marker -- reshape it into a string Date can parse reliably.
  const date = new Date(`${sqliteDatetime.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return sqliteDatetime;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Lists every document the signed-in user has saved (PL-10), newest first. */
export default function MyDocuments() {
  const [documents, setDocuments] = useState<SavedDocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSavedDocuments()
      .then(setDocuments)
      .catch(() => setError("Couldn't load your documents. Please try again."));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold text-brand-navy">My Documents</h1>
        <p className="mt-2 text-sm text-brand-gray">Documents you&rsquo;ve previously created, saved when downloaded.</p>
      </header>

      {error ? <p className={errorTextClass}>{error}</p> : null}

      {documents && documents.length === 0 ? (
        <p className="text-sm text-neutral-600">
          You haven&rsquo;t created any documents yet.{" "}
          <Link href="/" className="font-medium text-brand-blue hover:underline">
            Start one
          </Link>
          .
        </p>
      ) : null}

      {documents && documents.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <li key={document.id}>
              <Link
                href={`/documents/${document.slug}?documentId=${document.id}`}
                className="flex h-full flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-brand-blue hover:shadow-md"
              >
                <h2 className="text-sm font-semibold text-brand-navy">{document.title}</h2>
                <p className="text-xs text-brand-gray">Saved {formatCreatedAt(document.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
