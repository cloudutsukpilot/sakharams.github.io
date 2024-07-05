---
layout: post
title: Gem Install Jekyll - Timeout
categories: [issues-fixes]
tags: [Fixies, Website, Jekyll, Ruby, OpenSSL]
---

## Command:
gem install jekyll bundler 

## Error Messages:
```
ruby -r rubygems/remote_fetcher -e 'puts(Gem::RemoteFetcher.new.fetch_path("https://api.rubygems.org/specs.4.8.gz") ? "success" : "failure")'
```
```
Unable to download data from https://rubygems.org/ - Net::OpenTimeout: execution expired (https://rubygems.org/specs.4.8.gz)
```

```
/usr/lib/ruby/vendor_ruby/rubygems/remote_fetcher.rb:261:in `rescue in fetch_path': Net::OpenTimeout: execution expired (https://api.rubygems.org/specs.4.8.gz) (Gem::RemoteFetcher::FetchError)
	from /usr/lib/ruby/vendor_ruby/rubygems/remote_fetcher.rb:241:in `fetch_path'
	from -e:1:in `<main>'
/usr/lib/ruby/3.0.0/net/http.rb:987:in `initialize': execution expired (Net::OpenTimeout)
```

### System Configuration:
- Operating System: Ubuntu 22
 


### What steps resulted in this error?
1. Installing the Gem packages Jekyll:
```bash
gem install jekyll
```

### What does this error mean?
- This error means that there was a timeout while trying to reach the rubygems server.

### Why did this error occur?
- api.rubygems.org is currently experiencing issues with IPv6 setup: this hostname has 4 IPv6 addresses, but responds on neither of them. 
- Neither to ping, nor to TCP connection attempts. When you are running gem, your gem tries IPv6 addresses first and times out on them, not having time to even try IPv4 addresses.

### Solution
- The solution is to lower priority of IPv6 addresses for api.rubygems.org, so that gem will try IPv4 addresses first. 
- In order to do it, put these lines into /etc/gai.conf

```
# Debian defaults.
precedence  ::1/128         50
precedence  ::/0            40
precedence  2002::/16       30
precedence  ::/96           20
precedence  ::ffff:0:0/96   10

# Low precedence for api.rubygems.org IPv6 addresses.
precedence  2a04:4e42::0/32  5
```
