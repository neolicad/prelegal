import fs from "node:fs/promises";
import path from "node:path";
import NdaApp from "@/components/NdaApp";

async function readTemplate(filename: string): Promise<string> {
  // Templates live in the repo root's templates/ directory (see PL-5),
  // one level up from this Next.js app.
  const filePath = path.join(process.cwd(), "..", "templates", filename);
  return fs.readFile(filePath, "utf8");
}

export default async function Home() {
  const [coverPageTemplate, standardTermsTemplate] = await Promise.all([
    readTemplate("mutual-nda-coverpage.md"),
    readTemplate("mutual-nda.md"),
  ]);

  return <NdaApp coverPageTemplate={coverPageTemplate} standardTermsTemplate={standardTermsTemplate} />;
}
