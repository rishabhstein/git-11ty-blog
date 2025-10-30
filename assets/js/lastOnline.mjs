export default function getLastOnline({ collections }) {
  const feed = collections.combinedFeed;

  if (!feed || !feed.length) return new Date(); // fallback

  // Since your combinedFeed is sorted ascending (old → new), pick the last item
  const latestPost = feed[feed.length - 1];

  return latestPost.date; // frontmatter date
}