export default function getLastOnline(collectionApi) {
  // Get all posts (or all markdown files with date)
  const posts = collectionApi.getFilteredByGlob("./src/posts/*.md"); // adjust path

  if (!posts.length) return new Date();

  // Find the latest post based on frontmatter `date`
  const latestPost = posts.reduce((latest, post) => {
    return post.date > latest.date ? post : latest;
  }, posts[0]);

  return latestPost.date;
}
