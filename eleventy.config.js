// eleventy.config.js (ESM)
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import slugify from "slugify";
import CleanCSS from "clean-css";
import * as htmlmin from "html-minifier-terser"; // or: const htmlmin = require("html-minifier-terser");
import "dotenv/config"; // loads .env

const isProduction = process.env.ELEVENTY_ENV === "production";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("./src/images");

  // Boolean: is a “major section” like 310/420/540 (i.e. 2 digits + trailing 0)?
  eleventyConfig.addFilter("isMajorSection", (val) => {
    if (val == null) return false;
    return /^\d{2}0$/.test(String(val)); // 310, 420, 540, etc.
  });
  eleventyConfig.addFilter("markdown", (content) => md.render(content));
  eleventyConfig.addFilter(
    "cssmin",
    (code) => new CleanCSS({}).minify(code).styles
  );

  const md = markdownIt({ html: true, breaks: false, linkify: true }).use(
    markdownItAnchor,
    {
      level: [1, 2, 3, 4],
      slugify: (str) =>
        slugify(str, {
          lower: true,
          strict: true,
          remove: /["]/g,
        }),
      tabIndex: false,
      permalink: markdownItAnchor.permalink.linkAfterHeader({
        class: "anchor",
        symbol: "<span hidden>#</span>",
        style: "aria-labelledby",
      }),
    }
  );
  eleventyConfig.setLibrary("md", md);
  eleventyConfig.addFilter("md_first_inline", (str = "") => {
    let html = md.render(String(str)).trim();
    html = html.replace(/^\s*<p>/, "");
    html = html.replace(/<\/p>/, "");
    return html;
  });
  // nodeblock: prints a heading for `node`, then whatever inner content you pass it.
  eleventyConfig.addPairedShortcode(
    "nodeblock",
    function (content, node, baseLevel = 0) {
      // Compute semantic depth relative to the page
      let level = Number(node?.level ?? 0);
      let depth = level - Number(baseLevel) + 2; // base page content starts at <h2>
      if (depth < 2) depth = 2;
      if (depth > 6) depth = 6;

      const id = node?.node_id || "";
      const title = node?.title || "";

      // Heading + inner content (component render, etc.)
      return `
        <h${depth} id="${id}" class="h${depth}">${title}</h${depth}>
        ${content || ""}
        `.trim();
    }
  );

  eleventyConfig.addTransform("htmlmin", async function (content, outputPath) {
    if (isProduction && outputPath && outputPath.endsWith(".html")) {
      return await htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
    }
    return content;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
}
