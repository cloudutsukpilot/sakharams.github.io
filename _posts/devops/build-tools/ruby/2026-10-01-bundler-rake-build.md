---
layout: post
title: "Ruby Build with Bundler and Rake"
categories: [devops, build-tools, ruby]
tags: [DevOps, Build-Tools, Ruby, Rails, Bundler, Rake, SAST, SCA]
description: How Bundler and Rake build Ruby and Rails applications and gems, which files they need, how to lint, scan and test, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/ruby/bundler-rake-build.webp
  alt: "DevOps pipeline loop motif with the title Ruby with Bundler and Rake"
---

Ruby builds revolve around two tools: **Bundler** resolves, locks and installs gems from the
`Gemfile`, and **Rake** is the task runner that drives building, testing and packaging. For Rails
applications the "build" also includes precompiling assets; for libraries it means building and
publishing a `.gem`.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Build tools | Bundler, Rake, `gem build`; version managers: rbenv, rvm, asdf / mise |
| Package registry | RubyGems.org, private gem servers (Artifactory, Gemfury, GitHub Packages) |
| Build files | `Gemfile`, `Gemfile.lock`, `*.gemspec`, `Rakefile`, `.ruby-version`, `.bundle/config`, `config.ru`, `.rubocop.yml` |
| Lint and format | RuboCop (+ rubocop-rails, rubocop-rspec), Standard, Reek |
| SAST (open source) | Brakeman (Rails), Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, SonarQube Server |
| SCA | bundler-audit, OSV-Scanner, Trivy, Snyk Open Source, Mend |
| Frameworks | Ruby on Rails, Sinatra, Hanami |
| Test and coverage | RSpec, Minitest, Capybara; SimpleCov |
| Build output | `.gem` package, Rails app with precompiled assets, container image |
| CI cache | `vendor/bundle` (handled by `ruby/setup-ruby` with `bundler-cache: true`) |

## How the build works

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a Bundler / Rake command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/ruby/bundler-rake-ci-pipeline" %}

- **`bundle exec`** runs a command with exactly the gem versions in `Gemfile.lock`; always use it
  (or binstubs in `bin/`) in CI.
- **Platforms matter**: `Gemfile.lock` lists the platforms it was resolved for. Add the Linux
  platform (`bundle lock --add-platform x86_64-linux`) when developers use macOS but CI and
  production run Linux.
- **Deployment mode** (`bundle config set deployment true`) refuses to change the lockfile and
  installs into `vendor/bundle`.
- **New Rails applications** ship with Brakeman, RuboCop and a GitHub Actions workflow already set
  up (`bin/brakeman`, `bin/rubocop`).

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `Gemfile` | Gem sources, dependencies and groups | Yes |
| `Gemfile.lock` | Exact gem versions, platforms and checksums | Yes for apps; optional for gems |
| `*.gemspec` | Gem metadata and runtime dependencies (libraries) | Yes |
| `Rakefile` | Task definitions (build, test, release) | Yes |
| `.ruby-version` | Ruby version for rbenv / setup-ruby | Yes |
| `.bundle/config` | Local Bundler settings | No (CI sets them) |
| `config.ru` | Rack entry point for web apps | Yes |
| `.rubocop.yml` | Lint configuration | Yes |
| `vendor/bundle`, `pkg/` | Installed gems, built gems | No |

## Commands by category

```bash
bundle config set deployment true && bundle install --jobs 4   # reproducible install
bundle exec rubocop                              # lint
bundle exec brakeman --no-pager                  # SAST (Rails)
bundle exec bundle-audit check --update          # SCA
bundle exec rspec                                # tests (SimpleCov loaded in spec_helper)
RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile   # Rails asset build
bundle exec rake build                           # build pkg/demo-1.0.0.gem (Bundler gem tasks)
gem push pkg/demo-1.0.0.gem                      # publish
```

## Minimal project

```ruby
# Gemfile
source "https://rubygems.org"

ruby file: ".ruby-version"

gem "rails", "~> 8.0"
gem "puma"

group :development, :test do
  gem "rspec-rails"
  gem "rubocop-rails-omakase", require: false
  gem "brakeman", require: false
  gem "bundler-audit", require: false
  gem "simplecov", require: false
end
```

```ruby
# Rakefile for a gem: adds build, install and release tasks
require "bundler/gem_tasks"
require "rspec/core/rake_task"

RSpec::Core::RakeTask.new(:spec)
task default: :spec
```

## Frameworks

| Framework | Start a project |
|---|---|
| Ruby on Rails | `gem install rails && rails new app` |
| Sinatra | `bundle add sinatra puma` and a `config.ru` with `run Sinatra::Application` |
| Hanami | `gem install hanami && hanami new app` |
| A gem | `bundle gem demo` (creates gemspec, Rakefile, tests) |

## CI with GitHub Actions

{% raw %}
```yaml
name: ruby-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true                  # bundle install + cache vendor/bundle

      - run: bundle exec rubocop
      - run: bundle exec brakeman --no-pager
      - run: bundle exec bundle-audit check --update
      - run: bundle exec rspec
      - run: bundle exec rake build

      - uses: actions/upload-artifact@v4
        with:
          name: gem
          path: pkg/*.gem
```
{% endraw %}

## Best practices

- **Always run through `bundle exec`** (or binstubs) so the locked versions are used.
- **Commit `Gemfile.lock` with the Linux platform** added, and install in deployment mode in CI.
- **Pin Ruby** with `.ruby-version` and read it from the `Gemfile` (`ruby file: ".ruby-version"`).
- **Run Brakeman and bundler-audit on every PR**; both are fast and catch the most common Rails
  issues.
- **Use a private gem source** for internal gems with a `source "https://..." do` block, so internal
  names cannot be hijacked from RubyGems.org.
- **Precompile assets in the image build**, not at container start.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [PHP Build with Composer](/posts/devops/build-tools/php/composer-build/)
- [DevSecOps](/posts/devsecops/devsecops/)
