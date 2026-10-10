---
layout: post
title: "PHP Build with Composer: Build Files, Scanners and CI"
categories: [devops, build-tools, php]
tags: [DevOps, Build-Tools, PHP, Composer, Laravel, Symfony, SAST, SCA]
description: How Composer builds PHP applications, which files it needs, how to run static analysis, security scans and tests, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/php/composer-build.webp
  alt: "DevOps pipeline loop motif with the title PHP Build with Composer"
---

PHP is interpreted, so there is no compile step. The "build" is **Composer** installing locked
dependencies and generating an optimised autoloader, followed by static analysis (PHPStan or Psalm),
which does much of the checking a compiler does in other languages. Composer also runs project
scripts and audits dependencies for known vulnerabilities.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Build tools | Composer (install, autoload, scripts), Box (PHAR packaging), Phing / Robo (task runners) |
| Package registry | Packagist, Private Packagist, Satis, Artifactory |
| Build files | `composer.json`, `composer.lock`, `auth.json`, `phpunit.xml.dist`, `phpstan.neon`, `psalm.xml`, `.php-cs-fixer.dist.php`, `phpcs.xml` |
| Lint and format | PHP_CodeSniffer, PHP-CS-Fixer, Laravel Pint |
| Static analysis | PHPStan, Psalm |
| SAST (open source) | Psalm taint analysis, Semgrep, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, Fortify, SonarQube Server |
| SCA | `composer audit`, Roave Security Advisories, OSV-Scanner, Trivy, Snyk, Mend |
| Frameworks | Laravel, Symfony, Slim, Laminas, WordPress, Drupal |
| Test and coverage | PHPUnit, Pest, Codeception; coverage via PCOV or Xdebug |
| Build output | Source + `vendor/` packaged as a container image, PHAR archive |
| CI cache | Composer cache directory (`composer config cache-files-dir`) |

## How the build works

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a Composer command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/php/composer-ci-pipeline" %}

- **`composer update`** resolves new versions and rewrites `composer.lock`; only developers run it.
- **`composer install`** installs exactly what the lockfile says; CI and production only run this.
- **`--no-dev --optimize-autoloader`** (or `--classmap-authoritative`) removes dev tools and builds
  a fast classmap for production.
- **Platform requirements**: `config.platform.php` in `composer.json` makes resolution use the
  production PHP version, even if a developer runs a newer one locally.

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `composer.json` | Dependencies, autoload rules, scripts, platform config | Yes |
| `composer.lock` | Exact versions and dist hashes | Yes (applications) |
| `auth.json` | Credentials for private repositories | No |
| `phpunit.xml.dist` | Test suites and coverage config | Yes |
| `phpstan.neon` / `psalm.xml` | Static analysis level and rules | Yes |
| `.php-cs-fixer.dist.php` / `phpcs.xml` | Coding standard | Yes |
| `vendor/` | Installed packages | No |

## Commands by category

```bash
composer validate --strict                       # check composer.json / lock consistency
composer install --no-interaction --prefer-dist  # install from lockfile (CI)
vendor/bin/php-cs-fixer fix --dry-run --diff     # format check
vendor/bin/phpstan analyse --memory-limit=1G     # static analysis
vendor/bin/psalm --taint-analysis                # SAST (taint tracking)
composer audit                                   # SCA
vendor/bin/phpunit --coverage-text               # tests + coverage
composer install --no-dev --optimize-autoloader --classmap-authoritative   # production build
```

## Minimal project

```json
{
  "name": "example/api",
  "type": "project",
  "require": {
    "php": "^8.3",
    "slim/slim": "^4.14",
    "slim/psr7": "^1.7"
  },
  "require-dev": {
    "phpunit/phpunit": "^11.0",
    "phpstan/phpstan": "^2.0",
    "friendsofphp/php-cs-fixer": "^3.64"
  },
  "autoload": { "psr-4": { "App\\": "src/" } },
  "autoload-dev": { "psr-4": { "App\\Tests\\": "tests/" } },
  "config": {
    "platform": { "php": "8.3" },
    "sort-packages": true
  },
  "scripts": {
    "lint": "php-cs-fixer fix --dry-run --diff",
    "analyse": "phpstan analyse",
    "test": "phpunit"
  }
}
```

```yaml
# phpstan.neon
parameters:
  level: 6
  paths:
    - src
```

## Frameworks

| Framework | Start a project |
|---|---|
| Laravel | `composer create-project laravel/laravel app` |
| Symfony | `composer create-project symfony/skeleton app` |
| Slim | `composer create-project slim/slim-skeleton app` |
| WordPress (Bedrock) | `composer create-project roots/bedrock site` |

## CI with GitHub Actions

{% raw %}
```yaml
name: php-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          coverage: pcov
          tools: composer:v2

      - name: Composer cache
        id: composer-cache
        run: echo "dir=$(composer config cache-files-dir)" >> "$GITHUB_OUTPUT"
      - uses: actions/cache@v4
        with:
          path: ${{ steps.composer-cache.outputs.dir }}
          key: composer-${{ hashFiles('composer.lock') }}

      - run: composer validate --strict
      - run: composer install --no-interaction --prefer-dist
      - run: composer lint
      - run: composer analyse
      - run: composer audit
      - run: vendor/bin/phpunit --coverage-text
```
{% endraw %}

## Best practices

- **Commit `composer.lock`** and only run `composer install` outside development.
- **Set `config.platform.php`** to the production PHP version.
- **Raise the PHPStan level gradually** and use a baseline file for legacy code instead of
  lowering the level.
- **Fail on `composer audit`** in CI, and add `roave/security-advisories` to block installing known
  vulnerable versions at all.
- **Keep `auth.json` out of git**; pass credentials via `COMPOSER_AUTH` in CI.
- **Build production images with `--no-dev --classmap-authoritative`** and enable OPcache.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [Ruby Build with Bundler and Rake](/posts/devops/build-tools/ruby/bundler-rake-build/)
- [SonarQube](/posts/devsecops/sonarqube/sonarqube-getting-started/)
