---
title: "WV10-Boring tasks for ADHD mind and how I use AI agents"
date: 2026-04-22
tags: ["word-vomit"]
location: "Brussels, Belgium"
---

I am tired from a constant struggle to write a report about results I have obtained in the past few months of my postdoc. The main issue is that my mind does not want to do it; it's simply boring or not stimulating enough for my ADHD mind.

This problem is not the only one I face because of less stimulation. Another example is doing the household work. Of course I am aware it's boring for most people, but for an ADHD mind it is even worse. I can stay hungry the whole day to avoid deciding what to cook. It is a very boring task.

Similarly, I can ignore an important doctor's visit for six months simply because I need to first book an appointment. It is also a boring task.

This problem of lack of stimulation in the ADHD mind is [well known](https://www.nature.com/articles/d41586-026-00094-x) in scientific world. But it took me almost 30 years (I am in my mid-thirties) to understand why I failed do the same things as most people. And thanks to that, I do not blame myself if I am failing in some activty temporarily.

--

[Meadow wrote in a word-vomit post](https://meadow.cafe/blog/0070-too-many-things-on-the-mantel-shelf/) about his struggle with using AI agents and how he felt dissatisfied with agent-based productivity increases. I agree with his observations that agents are fun tools to use, but they are also becoming a pain in the ass because most employers force their employees to use agents and produce more. Luckily, in my case it's not an obligation. However, since an agent can solve a problem faster, I use it anyway. But I am not immune to its effect on my mind. Very often I feel frustrated because I do not want to debug the code manually. This problem demands another agent to do the job, and the loop begins.

Now it's interesting to me for psychological reasons. You see, talking to an agent is usually done by chatting, and [text-based communication is known to be lower-level](https://en.wikipedia.org/wiki/Media_richness_theory). So conveying my ideas accurately to an agent, especially in short messages, is difficult. Moreover, communication in a second language can exacerbate the situation. There can be a significant difference between the actual message and my explanation of it. Similarly, an agent's understanding of my explanation might not be accurate.

To deal with this communication gap and my frustration, I found a solution that works for me, at least. In past weeks, when I was playing with agents, one thing I tried was to write code myself while using the agent as a guide who knows neat coding tricks. For instance, if I want to read some huge data files without loading them all at once, I tell the agent and ask it to propose a solution. Then I use the solution I like in my code. In this way, I am always aware of what I am writing and where.

It's a little slower compared to when an agent writes the code. But in the end, I feel satisfied that I have done the work and not the agent. ==Sorry, agent, for taking the credits ;)==

In another project, I tried a different approach with LLM agents. I was using them in VS Code to solve a problem, and they were modifying the code itself. In the beginning it was fun because I obtained working code so fast. But later I saw the mess it had made in my code. My previous code was written to be edited by humans, so it was readable with a lot of comments. The agent's hard work changed the design completely; the code became unreadable. Many solutions were poorly implemented, and the code was split into a web of files that were hard to debug.

I am aware that by setting up the skills of the agent, such as in [Cursor](cursor.com), the LLM can behave more reliably and can write code more efficiently. However, I still prefer to do things myself using only the help of agents. I see it as analogous to using Google, but an advanced version of it.

I feel that faster solutions do not give me satisfaction. I like my evenings when I feel a sense of accomplishment. With LLMs, it's the opposite. I feel dissatisfied even after solving many problems.
