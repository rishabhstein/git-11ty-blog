---
title: "Testing a new blogging platform"
published: true
tags: ["blog"]
---  

For a long time, I was looking for an alternative to **Pyblosxom**--my current static site generator. Although it has many capabilities, including support for dynamic web content, I was only using it to generate static pages for my blog. A couple of days ago, [Manu](https://manuelmoreale.com) posted an interview with a blogger, [James](https://jamesg.blog), in his people and blogs series. James answers to the questions of Manu were very nice to read. I was immediately impressed by the calming vibe of James and his story of building blogging tools from scratch. This resonated with me for my current struggle with Pyblosxom.  

Immediately after reading his tools, I started exploring James' static site generator, [Aurora](https://github.com/capjamesg/aurora). Over this weekend, I was going through his code which is relatively simple and intuitive similar to Pyblosxom. There are several other features in Aurora such as setting up a template of blogposts, that are essential for an easy start to using this package. In addition, tags and categories are in-built in Aurora, which, incase of Pyblosxom, gave me a hard time making it work, even with default plugins. The code is built with Python-3 and only consists of three Python files, which makes it easy to read and play around. Moreover, its developer, James, is easily accessible by email, in case of any questions. 
 
Pyblosxom, on the other hand, is outdated and only supports Python2 [1], which makes it hard to compile on different systems--I successfully compiled it on Mac but was unable to do it on Ubuntu and Raspberry-Pi.  Most of its default plugins work fine, but they aren't very intuitive to use.  

Moving from **Pyblosxom** to **Aurora** for blogging, although seems an improvement, brings its caveats. I found, specifically, four missing features in Aurora: the first one is creating static pages without adding them to main blog post lists (index-page). The second missing feature is to set up--or I couldn't find a way--different styles for different sections of websites. The third one is the lack of support for the *Markdown* extension in templates. This is one of the essential features, in my view, as to set up simple pages such as Garden, I need to use *HTML* code which looks ugly. In Pyblosxom this was easily managed by using *Markdown* code. The fourth, and final, missing feature is the result of the first missing feature. As there is no method to have static pages, there is no straightforward link to refer to a static page. This can be very simply resolved by adding a way to not publish pages and keep them in separate folders.  

I am still exploring Aurora, and I have successfully moved my blog to it on my Mac. However, I haven't moved the static site from it to the server as I still do not feel confident about it. I am excited about the features I can add to my blog using Aurora.

--
 
**Update: Mar 12, 2025**  

Among the four problems I have mentioned, I was able to resolve two using meta-data and programing. These are very powerful features of Aurora as I can set up meta-data that can be used in programming (Jinja) to filter out the pages I want.  

The problem-1 of "static-pages" can not be mitigated directly but by hidding them based on assigned category. Let's say I can set up "draft" category and ignore this category to be shown on main list of posts. This also resolved problem-4. However, problem-2 and 3 are still there.