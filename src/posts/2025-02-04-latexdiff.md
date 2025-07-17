---
title: Latexdiff on multiple files
tags: post
---  

I was recently exploring a method to compare different versions of my thesis in latex. Interestingly, there is no simple way except joining all files in one **.tex** file and compare it with a similar file of older version. The files can be done joined in one **.tex** file using a python module, flattex which can be directly installed in using Git.

> git clone git@github.com:johnjosephhorton/flatex.git  
> cd flatex  
> pip install --editable  

Now, to compare the two versions of the thesis where main.tex is the file which keep the structure of all **.tex** files using **/input** method, flatex need to be ran first

> flatex /path/to/V1/main.tex /path/to/V1/old.tex  
> flatex /path/to/V2/main.tex /path/to/V2/new.tex

Finally, we can use latexdiff to compare old version (old.tex) with new version (new.tex)

> latexdiff /path/to/old.tex /path/to/new.tex > /path/to/diff.tex

Copy the graphics file related to newer version in the folder containing *diff.tex* and compile the latex file.