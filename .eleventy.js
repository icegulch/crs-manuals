const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const slugify = require("slugify");
const CleanCSS = require("clean-css");
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
  
  eleventyConfig.addCollection("orderedSections", function (collection) {
    return collection
      .getFilteredByTag("sections")
      .filter((item) => item.data?.section_id)
      .sort((a, b) =>
        a.data.section_id.localeCompare(b.data.section_id, undefined, {
          numeric: true,
        })
      );
  });

  // Custom filter to convert markdown strings into HTML
  eleventyConfig.addFilter("markdown", (content) => {
    return markdownLibrary.render(content);
  });

  // Set the markdown-it configuration
  eleventyConfig.setLibrary("md", markdownLibrary);

  eleventyConfig.addFilter("cssmin", function (code) {
    return new CleanCSS({}).minify(code).styles;
  });

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
      output: "_site",
    },
  };
};