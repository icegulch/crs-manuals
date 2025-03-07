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

  // Custom filter to pretty print JSON
  eleventyConfig.addFilter("prettyJson", function (value) {
    try {
      return JSON.stringify(value, null, 2); // Pretty print JSON with 2 spaces indentation
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return value;
    }
  });

  eleventyConfig.addCollection("orderedSections", function (collection) {
    // Sort reviews by section_id in ascending order
    return collection.getFilteredByTag("sections").sort((a, b) => {
      const sectionIDA = a.data.section_id.toLowerCase();
      const sectionIDB = b.data.section_id.toLowerCase();
      if (sectionIDA < sectionIDB) return -1;
      if (sectionIDA > sectionIDB) return 1;
      return 0;
    });
  });

  eleventyConfig.addCollection("nestedSections", function (collection) {
    let structure = {};

    collection.getFilteredByTag("sections").forEach((item) => {
      let data = item.data;

      if (data.is_activity) {
        structure[data.section_id] = {
          title: data.section_title,
          slug: data.section_id,
          children: {},
        };
      }

      if (data.is_element) {
        let parentId = data.activity_id;
        if (!structure[parentId]) {
          structure[parentId] = { title: `Activity ${parentId}`, children: {} };
        }
        structure[parentId].children[data.section_id] = {
          title: data.section_title,
          slug: data.section_id,
          abbr: data.abbr || "", // Include abbreviation if available
        };
      }
    });

    return structure;
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
      includes: "_includes",
      output: "_site",
    },
  };
};