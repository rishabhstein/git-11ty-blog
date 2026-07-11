---
title: "FreshRSS vs My Own Feed Reader: Which One Is Better?"
date: 2026-07-11
tags: ["self-hosting, indieweb, tech"]
---
We all consume online content by different means.  The majority of the people prefer mainstream social media while a small number of people use newsletters or RSS/Atom feeds. I am in the latter group.

Those who are not familiar with RSS feed, please have a look at it [here](https://RSS.com/blog/how-do-RSS-feeds-work/). It is a fantastic way to subscribe and read your favorite articles, news and blogs. You can even subscribe to Youtube channels using feeds. However, to access them you need a feed reader. Thanks to the open source community there are plenty of free options available such as *[FreshRSS](https://www.freshRSS.org/) and [Miniflux](https://miniflux.app/)*.

My primary feed reader is FreshRSS. Its' not that I am a big fan of it as I regularly experiment with new feed readers. However, in the end I always switch back to FreshRSS. The main reason is that it is (over)loaded with features, which makes it super useful. It allows syncing different devices so I can save articles and keep a record of them to read later on other devices.  But at the same time it is full of clutter so my ADHD mind does not like it. Another reason is that reading an article in FreshRSS's native reader, instead of at the author's website, gives me FOMO. I feel I can miss out some unannounced updates on fellow bloggers' websites. Also, it's boring to see new articles always in one design, especially when I can go to their original source. So I am always on a hunt to find a better feed reader.

Recently, I decided to take matters into my hands and write plugins/themes for FreshRSS, or develop an alternative-- my own feed reader. In either case, the main feature I wanted was link aggregation so that I can read a post at its source webpage. However, given my limited programming skills it was an intimidating task. So, I took some help from Claude to test both strategies, and figure out which one would be best for me. 

First, I worked on developing my own feed reader, **Sigmarootpi Times**, with a newspaper-like theme. If you have visited my blog earlier, you know my affinity towards news websites. For first-time viewers you can read [here](https://blog.rishabhps.com/posts/2026-04-17-old-newspaper-like-blog-design/) what I am talking about. Anyway, it took a couple of hours to develop everything from scratch and tweak here and there, but overall Claude did a good job. It's built on Node.js and even has a login screen which remembers the user for thirty days.

<div class="gallery">
  <img src="/assets/images/blog_posts/2026-11-07-sigmarootpi-times.jpeg" alt="my feed reader">
</div>

It is still far from being perfect but I got something reasonably close to my expectation. What I like about the design is a lot of graphics, which draw my attention to headlines. I can skim through hundreds of articles and read what I like. The feed reader keeps a history of what I have read and what I have not. It also pulls new posts every six hours, so I get a fresh newspaper four times a day. I have added a video column too where I can see newly posted YouTube videos from subscribed channels and watch them directly without opening YouTube. There is a dark mode as well.

Overall, I was quite satisfied with it. But after using it for a couple of weeks, I found that this method has a downside. The news website design utilizes graphics heavily which are in abundance in news posts but scarce in blog posts. Naturally, I was opening graphic-based articles more compared to posts with mundane headlines--Robert Birming wrote about the same issue that [blogs need more photos](https://robertbirming.com/your-blog-photos/). This kills the whole point for which I designed *Sigmarootpi Times* as I prefer to read blog posts over news articles.

So, I moved to my second idea--modifying FreshRSS by developing its plugins. Again, I used Claude for it. I mentioned above that I wanted FreshRSS to act as a link aggregator and not as a feed reader. So, I took inspiration from [Hacker News](https://news.ycombinator.com) design and built an extension which modify FreshRSS theme.

<div class="gallery">
  <img src="/assets/images/blog_posts/2026-11-07-hackernews-freshrss.jpeg" alt="freshrss">
</div>

The main working of FreshRSS is still the same except the result of direct click on a new post. Now clicking on the link opens the entry on the original website, and not in the native reader. In case I want to read a post in FreshRSS, I have added a "note icon" which opens the entry in native reader. 

After modifying FreshRSS, I found myself using it more for blog post reading. On the main page, I only see a list of posts from my subscribed feeds with no eye-catching features (graphics). So, they all look the same and I can go through them one by one.

What I learnt from this experiment is that for skimming through a large number of feeds, *Sigmarootpi Times* is a better choice. After all, news websites are designed to make you click on something, if not everything. However, for reading every single new post a distraction-free reader is more suitable. I will be using both.

I am not sharing *Sigmarootpi Times's* code here as I am shy about it. But if you are interested, you can ask for it. For FreshRSS extension you can [download it from GitHub](https://github.com/rishabhstein/xExtension-hackernewsTheme).


