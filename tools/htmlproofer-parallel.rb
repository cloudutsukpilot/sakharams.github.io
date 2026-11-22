# frozen_string_literal: true

# Runs html-proofer over a built site in several processes at once.
#
# html-proofer checks one file at a time on one CPU core, so on this site
# (about 2,000 pages) it was the slowest step of the deploy. This script
# splits the HTML files into shards, gives each shard to its own forked
# html-proofer runner and fails if any shard fails.
#
# The checks are the same as `htmlproofer <site> --disable-external
# --ignore-urls ...`: every runner sees the whole site on disk, so a link in
# one shard to a page or #anchor in another shard is still resolved and
# checked. Each shard checks the links found in its own files, so together
# the shards check every link exactly as a single run does.
#
# Usage: bundle exec ruby tools/htmlproofer-parallel.rb [SITE_DIR]
#   HTMLPROOFER_JOBS=N  number of processes (default: number of CPUs)

require "etc"
require "tempfile"
require "html-proofer"

site = ARGV.fetch(0, "_site")
abort "#{site} is not a directory; build the site first" unless File.directory?(site)

# html-proofer changes the options hash it is given, so build a new one each time.
def options
  {
    disable_external: true,
    ignore_urls: [%r{^http://127.0.0.1}, %r{^http://0.0.0.0}, %r{^http://localhost}],
  }
end

# The file list html-proofer itself would check (extensions, ignore_files).
all_files = HTMLProofer.check_directory(site, options).files
jobs = Integer(ENV.fetch("HTMLPROOFER_JOBS", Etc.nprocessors)).clamp(1, [all_files.size, 1].max)

# Spread the work by size: biggest file first, each to the lightest shard.
shards = Array.new(jobs) { [] }
loads = Array.new(jobs, 0)
all_files.sort_by { |f| -File.size(f[:path]) }.each do |file|
  i = loads.index(loads.min)
  shards[i] << file
  loads[i] += File.size(file[:path])
end

puts "html-proofer: #{all_files.size} files in #{site}, #{jobs} parallel shards"
started = Process.clock_gettime(Process::CLOCK_MONOTONIC)

children = shards.each_with_index.map do |shard, i|
  log = Tempfile.new(["htmlproofer-shard-#{i}-", ".log"])
  pid = fork do
    $stdout.reopen(log)
    $stderr.reopen(log)
    $stdout.sync = $stderr.sync = true
    runner = HTMLProofer.check_directory(site, options)
    runner.define_singleton_method(:files) { shard }
    # run calls exit(1) when it finds failures. Leave with exit! so the child
    # skips at_exit hooks (they would delete the parent's Tempfile logs).
    code = begin
      runner.run
      0
    rescue SystemExit => e
      e.status
    rescue StandardError => e
      warn "html-proofer crashed: #{e.class}: #{e.message}"
      2
    end
    exit!(code)
  end
  { index: i, pid: pid, log: log, files: shard.size }
end

failed = children.reject do |child|
  _, status = Process.wait2(child[:pid])
  puts "\n--- shard #{child[:index] + 1}/#{jobs} (#{child[:files]} files) ---"
  puts File.read(child[:log].path)
  child[:log].close!
  status.success?
end

elapsed = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - started).round(1)
if failed.empty?
  puts "\nhtml-proofer: all #{jobs} shards passed on #{all_files.size} files in #{elapsed}s"
else
  warn "\nhtml-proofer: #{failed.size} of #{jobs} shards failed (see above), #{elapsed}s"
  exit 1
end
