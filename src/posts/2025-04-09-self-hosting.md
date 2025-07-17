---
title: "Self-hosting"
published: true
tags: ["self-hosting"]
---

Recently I became very interested in self-hosting popular cloud services such as drive, notes, media-servers (like netflix), and even a google like search engine. This fascination with self-hosting is not new to me as this very blog is self-hosted on a RaspberryPi. You can check my blog setup on [colophon](/2025/02/21/colophon/) page. However, hearing so much criticism of *Google* like companies--selling data and targeted advertisments--from my fellow *Indie* bloggers motivated me further to try self-hosting. Since I have all the ingredients, it was a matter of time before I tried self-hosting.

For the past couple of weeks, I have been experimenting with several of these services including [NextCloud](https://nextcloud.com) as a replacement of *Gdrive*, [pigallery2](https://bpatrik.github.io/pigallery2/) for *google-photos*, [Snippet-box](https://github.com/pawelmalak/snippet-box) as a technical note taking app, and [Whoogle](https://github.com/benbusby/whoogle-search) as a replacement of advertisement master, *Google*. I have also set up my own self-hosted adblocker, [Pi-hole](https://pi-hole.net), that has reduced the amount of ads I see on other websites. At this point, I am very happy with this setup and I plan to experiment further by setting up a media server so that I can watch my favorite shows and listen to ad-free music from my own system.

<!-- Image Gallery -->
<div class="gallery">
  <img src="/assets/images/blog_posts/whoogle.jpg" alt="whoogle">
  <img src="/assets/images/blog_posts/nextcloud.jpg" alt="nextcloud">
</div>


I am accessing these services using a [WireGuard](https://www.wireguard.com) VPN which allows me to connect to my home wifi from anywhere in the world without exposing any *ports* and local *IP*. That means no one else can sneak into my network and use these services. However my blog and *Whoogle* are exposed to outside network and people can use them but I tried to keep them hidden behind a *Cloudflare* tunnel.

This whole setup might sound very exciting but I would like to remind you that it is not free from vulnerabilities. It's a bit sad to learn that internet is full of data-thieves and hackers--in the form of bots and crawlers made by humans--which will not miss a single chance to hack your system. So **I would not encourage anyone to try self-hosting without any guidance.** I am also not an expert in network systems but I am following the advices of experts on internet as well as from real life.