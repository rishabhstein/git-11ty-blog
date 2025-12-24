module.exports = async function(eleventyConfig) {
  // Dynamically import ESM modules
  const { EleventyRenderPlugin } = await import("@11ty/eleventy");
  const { feedPlugin } = await import("@11ty/eleventy-plugin-rss");
  const { DateTime } = await import("luxon");
  const markdownItModule = await import("markdown-it");
  const markdownIt = markdownItModule.default;
  const markdownItMark = require("markdown-it-mark");

  //Just copy these files to _site
  eleventyConfig.addPassthroughCopy('./assets');
  eleventyConfig.addPassthroughCopy('./src/style.css');
  eleventyConfig.addPassthroughCopy('./src/robots.txt');

  // Creating a datetime format filter
  eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toLocaleString(DateTime.DATE_MED);
  });

  // Using RenderPlugin
  eleventyConfig.addPlugin(EleventyRenderPlugin);

  // Creating a Markdown filter
  const md = markdownIt({
    html: true,
    breaks: true,
    linkify: true
  }).use(markdownItMark); // 👈 enables ==highlight== syntax

  eleventyConfig.addFilter("markdownify", (value) => {
    return md.render(value || "");
  });


  // Filtering only few words
  eleventyConfig.addFilter("wordLimit", function(content, limit = 50) {
    if (!content) return "";
    const words = content.split(/\s+/).slice(0, limit);
    return words.join(" ") + "...";
  });

  // Collection for all unique tags
  eleventyConfig.addCollection("tagList", function(collection) {
    const tagsSet = new Set();
    collection.getAll().forEach(item => {
      (item.data.tags || []).forEach(tag => tagsSet.add(tag));
    });
    return [...tagsSet];
  });

  // Group posts by year
  eleventyConfig.addCollection("postsByYear", function(collectionApi) {
    const posts = collectionApi.getFilteredByGlob("./posts/*.md");

    let postsByYear = {};

    posts.forEach(post => {
      const year = post.date.getFullYear();
      if (!postsByYear[year]) postsByYear[year] = [];
      postsByYear[year].push(post);
    });

    return postsByYear;
  });

  // // Adding RSS feed and Combined feed collection
  eleventyConfig.addCollection("combinedFeed", function (collectionApi) {
    return [
      ...collectionApi.getFilteredByTag("post"),
      ...collectionApi.getFilteredByTag("snap"),
      ...collectionApi.getFilteredByTag("books"),
      ...collectionApi.getFilteredByTag("movies"),
      ...collectionApi.getFilteredByTag("microfeed"),
    ].sort((a, b) => a.date - b.date); // Sort descending by date
  });

  //================================================//

  eleventyConfig.addPlugin(feedPlugin, {
  type: "rss",
  outputPath: "/feed.xml",
  collection: {
    name: "combinedFeed",
    limit: 30,
  },
  metadata: {
    language: "en",
    title: "Sigmarootpi",
    subtitle: "An outdated habbit of spitting my thoughts.",
    base: "https://sigmarootpi.com/",
    author: {
      name: "Rishabh",
      email: "hello@sigmarootpi.com",
    },
  },

  items: {
    pubDate: item =>
      DateTime
        .fromJSDate(item.page.date, { zone: "EU/Brussels" })
        .toRFC2822(),
  },


  postRender: (item) => {
    // Append "Reply via email" link after each post content
        // Encode the title to be safe for URL
    const subject = encodeURIComponent(item.data.title || "Your Post");

    return (
      item.templateContent +
      `<p><a href="mailto:hello@sigmarootpi.com?subject=${subject}Reply to your post">Reply via email</a></p>`
    );
  },
});



  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};
