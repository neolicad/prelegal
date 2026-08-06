"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NdaPreviewProps {
  ref?: React.Ref<HTMLDivElement>;
  markdown: string;
}

export default function NdaPreview({ ref, markdown }: NdaPreviewProps) {
  return (
    <div className="max-h-[calc(100vh-10rem)] overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div ref={ref} className="nda-document">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
