import { describe, expect, it } from "vitest";
import { parseMdxDocument } from "./mdx-parser";
import { chunkDocument } from "./chunker";

const fixture = `
import Layout from "@/components/Layout";
import {
  GoArrowLeft,
} from "react-icons/go";
<Layout>
<Head><title>استقرار برنامه NextJS - لیارا</title></Head>
# استقرار برنامه NextJS در لیارا
<p>پروژه باید فایل <Important>package.json</Important> داشته باشد و توضیح کافی برای ایندکس شدن این سند در این بخش قرار گرفته است.</p>
<Step steps={[{
  step: "۱",
  content: (<><h3>اجرای build</h3><p>فرمان <Important>npm run build</Important> اجرا می‌شود و نتیجه در گزارش استقرار نمایش داده می‌شود.</p></>)
}]}/>
<Section id="logs" title="بررسی گزارشات" />
<p>برای عیب‌یابی، گزارشات نرم‌افزاری را بررسی کنید.</p>
].map(item =>
{item.title}
<Highlight className="bash">{\`liara deploy\`}</Highlight>
\`\`\`tsx
import { preservedInsideFence } from "example";
\`\`\`
</Layout>`;

describe("MDX ingestion", () => {
  it("extracts Liara JSX content without imports", () => {
    const parsed = parseMdxDocument(fixture, "paas/nextjs/how-tos/deploy-app.mdx", "abc123");
    expect(parsed?.metadata.framework).toBe("nextjs");
    expect(parsed?.metadata.url).toBe("https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/");
    expect(parsed?.markdown).toContain("npm run build");
    expect(parsed?.markdown).toContain("```\nliara deploy\n```");
    expect(parsed?.markdown).toContain('import { preservedInsideFence } from "example";');
    expect(parsed?.markdown).not.toContain("import Layout");
    expect(parsed?.markdown).not.toContain("GoArrowLeft");
    expect(parsed?.markdown).not.toContain("item.title");
  });

  it("preserves sections, anchors, and code in semantic chunks", () => {
    const parsed = parseMdxDocument(fixture, "paas/nextjs/how-tos/deploy-app.mdx", "abc123");
    if (!parsed) throw new Error("fixture did not parse");
    const document = chunkDocument(parsed.metadata, parsed.markdown);
    const logs = document.chunks.find((chunk) => chunk.section === "بررسی گزارشات");
    expect(logs?.url).toBe("https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/#logs");
    expect(logs?.content).toContain("liara deploy");
  });

  it("keeps heading paths dense when MDX skips heading levels", () => {
    const parsed = parseMdxDocument(
      "# راهنما\n\nمتن کافی برای معتبر بودن سند و ساخت یک بخش قابل جست‌وجو در پایگاه دانش.\n\n### تنظیمات\n\nتوضیحات کامل تنظیمات برنامه.",
      "paas/example.mdx",
      "abc123"
    );
    if (!parsed) throw new Error("fixture did not parse");
    const document = chunkDocument(parsed.metadata, parsed.markdown);
    const settings = document.chunks.find((chunk) => chunk.section === "تنظیمات");
    expect(settings?.headingPath).toEqual(["راهنما", "تنظیمات"]);
    expect(settings?.headingPath.every((heading) => typeof heading === "string")).toBe(true);
  });
});
