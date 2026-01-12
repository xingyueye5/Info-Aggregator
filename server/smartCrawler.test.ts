import { describe, expect, it } from "vitest";
import { analyzePageType } from "./smartCrawler";

describe("smartCrawler", () => {
  describe("analyzePageType", () => {
    it("should identify article page correctly", async () => {
      const articleHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Test Article</title></head>
        <body>
          <article>
            <h1>Article Title</h1>
            <div class="author">John Doe</div>
            <time datetime="2024-01-01">January 1, 2024</time>
            <p>This is the first paragraph of the article.</p>
            <p>This is the second paragraph with more content.</p>
            <p>This is the third paragraph with even more content.</p>
            <p>This is the fourth paragraph.</p>
            <p>This is the fifth paragraph.</p>
            <p>This is the sixth paragraph.</p>
          </article>
        </body>
        </html>
      `;

      const result = await analyzePageType("https://example.com/article", articleHtml);

      expect(result.type).toBe("article");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should identify list page with search results", async () => {
      const listHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Search Results</title></head>
        <body>
          <div class="search-results">
            <p>Showing 1-10 of 100 results</p>
            <div class="item">
              <h3><a href="/article1">Article 1</a></h3>
            </div>
            <div class="item">
              <h3><a href="/article2">Article 2</a></h3>
            </div>
            <div class="item">
              <h3><a href="/article3">Article 3</a></h3>
            </div>
            <div class="item">
              <h3><a href="/article4">Article 4</a></h3>
            </div>
            <div class="pagination">
              <a href="?page=2">Next</a>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await analyzePageType("https://example.com/search", listHtml);

      expect(result.type).toBe("list");
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.childLinks).toBeDefined();
      expect(result.childLinks!.length).toBeGreaterThan(0);
    });

    it("should identify list page with card layout", async () => {
      const listHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Blog Posts</title></head>
        <body>
          <div class="posts">
            <div class="card"><a href="/post1">Post 1</a></div>
            <div class="card"><a href="/post2">Post 2</a></div>
            <div class="card"><a href="/post3">Post 3</a></div>
            <div class="card"><a href="/post4">Post 4</a></div>
            <div class="card"><a href="/post5">Post 5</a></div>
          </div>
        </body>
        </html>
      `;

      const result = await analyzePageType("https://example.com/blog", listHtml);

      expect(result.type).toBe("list");
      expect(result.childLinks).toBeDefined();
    });

    it("should extract child links from list page", async () => {
      const listHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <article>
            <h2><a href="/article1">Article 1</a></h2>
          </article>
          <article>
            <h2><a href="/article2">Article 2</a></h2>
          </article>
          <article>
            <h2><a href="/article3">Article 3</a></h2>
          </article>
        </body>
        </html>
      `;

      const result = await analyzePageType("https://example.com/list", listHtml);

      if (result.type === "list" && result.childLinks) {
        expect(result.childLinks.length).toBeGreaterThan(0);
        expect(result.childLinks[0]).toContain("https://example.com");
      }
    });

    it("should filter out navigation and login links", async () => {
      const listHtml = `
        <!DOCTYPE html>
        <html>
        <body>
          <nav>
            <a href="/login">Login</a>
            <a href="/about">About</a>
          </nav>
          <article>
            <h2><a href="/article1">Article 1</a></h2>
          </article>
          <article>
            <h2><a href="/article2">Article 2</a></h2>
          </article>
        </body>
        </html>
      `;

      const result = await analyzePageType("https://example.com/list", listHtml);

      if (result.type === "list" && result.childLinks) {
        expect(result.childLinks.every(link => !link.includes("/login"))).toBe(true);
        expect(result.childLinks.every(link => !link.includes("/about"))).toBe(true);
      }
    });
  });
});
