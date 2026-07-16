---
title: "Blogroll"
---

I am just a beginner at blogging, so I can offer you only so much. However, I can recommend you some fantastic blogs that I read on a regular basis. These are the people whom I've never met and yet they've inspired me. [#positiveWeb](#)

{% for link in blogroll %}
- [{{ link.label }}]({{ link.url }})
{%- endfor %}