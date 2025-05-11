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

  eleventyConfig.addCollection("nestedSections", function (collectionApi) {
    let seriesMap = {};

    collectionApi
      .getFilteredByTag("sections")
      .filter((item) => item.data && item.data.section_id)
      .forEach((item) => {
        if (!item.url) return;

        const {
          series_id,
          series_title,
          subseries_id,
          subseries_title,
          section_id,
          section_title,
          ancillary = false,
          sort_order,
        } = item.data;

        const url = item.page.url;

        const seriesId = series_id?.toString();
        const subseriesId = subseries_id?.toString();
        const sectionId = section_id?.toString();
        const finalSortOrder = sort_order ?? series_id ?? 999;

        if (!seriesMap[seriesId]) {
          seriesMap[seriesId] = {
            id: seriesId,
            title: series_title || `Series ${seriesId}`,
            url,
            ancillary,
            sort_order: finalSortOrder,
            children: [],
          };
        }

        const series = seriesMap[seriesId];

        // Case 1: Subseries nesting
        if (subseriesId) {
          let subseries = series.children.find((c) => c.id === subseriesId);
          if (!subseries) {
            subseries = {
              id: subseriesId,
              title: subseries_title || `Subseries ${subseriesId}`,
              url,
              children: [],
            };
            series.children.push(subseries);
          }

          if (sectionId) {
            subseries.children.push({
              id: sectionId,
              title: section_title || `Section ${sectionId}`,
              url,
            });
          }

          // Case 2: Pseudo-parent like 432 with 432a
        } else if (sectionId === seriesId) {
          // Add the parent section to children, with future children
          let parent = series.children.find((c) => c.id === sectionId);
          if (!parent) {
            parent = {
              id: sectionId,
              title: section_title || `Section ${sectionId}`,
              url,
              children: [],
            };
            series.children.push(parent);
          }

          // Case 3: 432a should go under 432
        } else if (
          sectionId &&
          sectionId.startsWith(seriesId) &&
          sectionId !== seriesId
        ) {
          // Find or create the parent node
          let parent = series.children.find((c) => c.id === seriesId);
          if (!parent) {
            parent = {
              id: seriesId,
              title: `Section ${seriesId}`,
              url: series.url,
              children: [],
            };
            series.children.push(parent);
          }

          parent.children = parent.children || [];
          parent.children.push({
            id: sectionId,
            title: section_title || `Section ${sectionId}`,
            url,
          });

          // Case 4: Top-level section directly under series (e.g., 401)
        } else if (sectionId && url !== series.url) {
          series.children.push({
            id: sectionId,
            title: section_title || `Section ${sectionId}`,
            url,
          });
        }
      });

    // Final sorting and cleanup
    let sortedSeries = Object.values(seriesMap).sort(
      (a, b) => a.sort_order - b.sort_order
    );

    sortedSeries.forEach((series) => {
      series.children.sort((a, b) => a.id.localeCompare(b.id));
      series.children.forEach((child) => {
        if (Array.isArray(child.children)) {
          child.children.sort((a, b) => a.id.localeCompare(b.id));
        }
      });

      series.has_children = series.children.some((child) =>
        Array.isArray(child.children) ? child.children.length > 0 : true
      );
    });

    return sortedSeries;
  });
    
  eleventyConfig.addCollection("orderedSections", function (collection) {
    return collection
      .getFilteredByTag("sections")
      .filter((item) => item.data && item.data.section_id !== undefined) // ✅ Ensures valid sections
      .sort((a, b) => {
        let sectionIDA = a.data.section_id.toString(); // Convert everything to string
        let sectionIDB = b.data.section_id.toString();

        let numericA = parseFloat(sectionIDA); // Extract numeric part
        let numericB = parseFloat(sectionIDB);

        // If both are numeric, compare as numbers
        if (!isNaN(numericA) && !isNaN(numericB)) {
          return numericA - numericB;
        }

        // If one is alphanumeric, compare as strings (natural sort)
        return sectionIDA.localeCompare(sectionIDB, undefined, { numeric: true });
      });
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
      layouts: "_layouts",
      output: "_site",
    },
  };
};