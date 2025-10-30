module.exports = async function(eleventyConfig) {
  // Dynamically import ESM modules
  const { EleventyRenderPlugin } = await import("@11ty/eleventy");
  const { feedPlugin } = await import("@11ty/eleventy-plugin-rss");
  const { DateTime } = await import("luxon");
  const markdownItModule = await import("markdown-it");
  const markdownIt = markdownItModule.default;

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
  const md = new markdownIt();
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

 // Import and run your custom Last Online logic
  // Make it globally available to templates
  const lastOnlineModule = await import("./assets/js/lastOnline.mjs");
  const lastOnlineValue = await lastOnlineModule.default();
  eleventyConfig.addGlobalData("lastOnline", lastOnlineValue);

eleventyConfig.addFilter("timeAgo", (dateObj) => {
  const now = DateTime.utc();
  const then = DateTime.fromJSDate(dateObj);
  const diff = now.diff(then, ["days", "hours"]).toObject();

  if (diff.days >= 1) return `${Math.floor(diff.days)} day(s) ago`;
  return `${Math.floor(diff.hours)} hour(s) ago`; // always show hours if <1 day
});

  //================================================//

  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss", // "atom" or "rss", "json"
    outputPath: "/feed.xml",
    collection: {
      name: "combinedFeed", // changed from "post" to "posts" to match collection name
      limit: 30,     // 0 means no limit
    },
    metadata: {
      language: "en",
      title: "Sigmarootpi (&#963;&#8730;&#960)",
      subtitle: "An outdated habbit of spitting my thoughts.",
      base: "https://sigmarootpi.com/",
      author: {
        name: "Rishabh",
        email: "sigmarootpi@proton.me", // Optional
      }
    }
  });

  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};
