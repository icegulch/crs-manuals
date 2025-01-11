const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const slugify = require("slugify");
const htmlmin = require("html-minifier");
const util = require("util");
require("dotenv").config();
const isProduction = process.env.ELEVENTY_ENV === `production`;

// Markdown-it configuration
let markdownLibrary = markdownIt({
  html: true,
  breaks: true, // Enable line breaks
  linkify: true // Autoconvert URL-like text to links
}).use(markdownItAnchor, {
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
  })
});

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("./src/images");

  // Custom filter to pretty print JSON
  eleventyConfig.addFilter("prettyJson", function (value) {
    try {
      return JSON.stringify(value, null, 2); // Pretty print JSON with 2 spaces indentation
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return value;
    }
  });

  // Custom filter to convert markdown strings into HTML
  eleventyConfig.addFilter("markdown", (content) => {
    return markdownLibrary.render(content);
  });

  // Set the markdown-it configuration
  eleventyConfig.setLibrary("md", markdownLibrary);

  // Minify HTML output
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (isProduction && outputPath && outputPath.endsWith(".html")) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
      return minified;
    }
    return content;
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
  };
};