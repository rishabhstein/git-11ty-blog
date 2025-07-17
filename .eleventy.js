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
    ].sort((a, b) => a.date - b.date); // Sort descending by date
  });


  eleventyConfig.addPlugin(feedPlugin, {
    type: "rss", // "atom" or "rss", "json"
    outputPath: "/feed.xml",
    collection: {
      name: "combinedFeed", // changed from "post" to "posts" to match collection name
      limit: 10,     // 0 means no limit
    },
    metadata: {
      language: "en",
      title: "Cogito, ergo sum",
      subtitle: "An outdated habbit of spitting my thoughts.",
      base: "https://sigmarootpi.com/",
      author: {
        name: "Rishabh Sharma",
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
