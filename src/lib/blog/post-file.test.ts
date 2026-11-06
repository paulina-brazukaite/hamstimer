import { describe, expect, it } from "vitest";
import { parsePostFile, serializePostFile, slugify } from "./post-file";
import { renderPostBody } from "./render";

describe("post files", () => {
  it("round-trips front matter, including awkward characters", () => {
    const file = {
      meta: { title: 'Why "50": a note', description: "Line one\nline two", date: "2026-11-06" },
      body: "Hello **world**",
    };
    const parsed = parsePostFile(serializePostFile(file));
    expect(parsed?.meta).toMatchObject(file.meta);
    expect(parsed?.body.trim()).toBe("Hello **world**");
  });

  it("accepts unquoted values written by hand, and Windows line endings", () => {
    const parsed = parsePostFile("---\r\ntitle: Hand written\r\ndate: 2026-01-02\r\ndraft: true\r\n---\r\nBody");
    expect(parsed?.meta.title).toBe("Hand written");
    expect(parsed?.meta.date).toBe("2026-01-02");
    expect(parsed?.meta.draft).toBe(true);
  });

  it("rejects files without front matter or a title", () => {
    expect(parsePostFile("just text")).toBeNull();
    expect(parsePostFile("---\ndate: \"2026-01-01\"\n---\nx")).toBeNull();
  });

  it("makes clean slugs", () => {
    expect(slugify("Why 50 Minutes? (A Guide)")).toBe("why-50-minutes-a-guide");
    expect(slugify("  Laikmatis – Vilnius ąčę ")).toBe("laikmatis-vilnius-ace");
  });
});

describe("rendering", () => {
  it("turns Markdown into HTML", () => {
    expect(renderPostBody("## Hi\n\n**bold**")).toContain("<h2>Hi</h2>");
  });

  it("strips scripts, event handlers and javascript: links", () => {
    const html = renderPostBody(
      '<p onclick="x()">ok</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><iframe src="x"></iframe>',
    );
    expect(html).not.toMatch(/script|onclick|javascript:|iframe/);
    expect(html).toContain("<p>ok</p>");
  });

  it("demotes h1, opens external links safely, lazy-loads images", () => {
    const html = renderPostBody('<h1>T</h1><a href="https://example.com">x</a><img src="/a.png" alt="a">');
    expect(html).toContain("<h2>T</h2>");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('loading="lazy"');
  });
});
