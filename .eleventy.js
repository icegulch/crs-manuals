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
      .filter((item) => item.data && item.data.section_id !== undefined) // ✅ Prevent undefined errors
      .forEach((item) => {
        if (!item.url) return;

        const {
          series_id,
          series_title,
          subseries_id,
          subseries_title,
          section_id,
          section_title,
        } = item.data;

        let url = item.page.url

        let sectionIdNum = section_id
          ? parseFloat(section_id) || section_id
          : null;
        let subseriesIdNum = subseries_id
          ? parseFloat(subseries_id) || subseries_id
          : null;
        let seriesIdNum = series_id ? parseFloat(series_id) || series_id : null;

        if (!seriesMap[series_id]) {
          seriesMap[series_id] = {
            id: seriesIdNum,
            title: series_title || `Series ${series_id}`,
            url: url,
            children: [],
          };
        }

        if (subseries_id) {
          let subseriesEntry = seriesMap[series_id].children.find(
            (sub) => sub.id === subseriesIdNum
          );
          if (!subseriesEntry) {
            subseriesEntry = {
              id: subseriesIdNum,
              title: subseries_title || `Subseries ${subseries_id}`,
              url: url,
              children: [],
            };
            seriesMap[series_id].children.push(subseriesEntry);
          }

          if (section_id) {
            subseriesEntry.children.push({
              id: sectionIdNum,
              title: section_title || `Section ${section_id}`,
              url: url,
              children: [],
            });
          }
        } else if (section_id) {
          seriesMap[series_id].children.push({
            id: sectionIdNum,
            title: section_title || `Section ${section_id}`,
            url: url,
            children: [],
          });
        }
      });

    let sortedSeries = Object.values(seriesMap).sort((a, b) => a.id - b.id);
    sortedSeries.forEach((series) => {
      series.children.sort((a, b) => a.id - b.id);
      series.children.forEach((subseries) => {
        subseries.children.sort((a, b) => a.id - b.id);
      });
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