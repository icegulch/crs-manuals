// eleventy.config.js (ESM)
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import slugify from "slugify";
import CleanCSS from "clean-css";
import * as htmlmin from "html-minifier-terser"; // or: const htmlmin = require("html-minifier-terser");
import "dotenv/config"; // loads .env

const isProduction = process.env.ELEVENTY_ENV === "production";

export default function (eleventyConfig) {
  const md = markdownIt({ html: true, breaks: true, linkify: true }).use(
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

  eleventyConfig.addPassthroughCopy("./src/images");

  eleventyConfig.addFilter("markdown", (content) => md.render(content));
  eleventyConfig.addFilter(
    "cssmin",
    (code) => new CleanCSS({}).minify(code).styles
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
    }
  };
  
}
