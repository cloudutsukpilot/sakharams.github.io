#!/bin/bash
cd /Users/Sakharam.Shinde/github/sakharams.github.io
nohup /Users/Sakharam.Shinde/.rvm/gems/ruby-3.3.0/bin/bundle exec jekyll serve --watch > /tmp/jekyll-serve.log 2>&1 &

