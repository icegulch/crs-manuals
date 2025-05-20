module.exports = {
  layout: "layouts/base",
  tags: ["sections"],
  eleventyComputed: {
    permalink: (data) => {
      if (!data.page || !data.page.filePathStem) return false;

      const trimmed = data.page.filePathStem.split("/").slice(3);
      return "/" + trimmed.join("/") + "/";
    },
  },
};
