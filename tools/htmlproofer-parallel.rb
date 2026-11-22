# frozen_string_literal: true

# Runs html-proofer over a built site, faster, with the same checks.
#
# On this site (about 2,000 pages) html-proofer was the slowest step of the
# deploy (about 3 minutes). Two changes, neither of which drops a check:
#
# 1. Anchor lookups use a set of the page's id/name values instead of a
#    whole-document XPath per #fragment (see FastFragmentLookup below).
# 2. The HTML files are split into shards, one forked html-proofer runner per
#    CPU (html-proofer itself uses one core), and the run fails if any shard
#    fails. Each shard prints its output in turn.
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

require "set"

# Anchor (#hash) checks: html-proofer 5 looks each fragment up with
# `//*[case_sensitive_equals(@id, 'x')] | //*[case_sensitive_equals(@name, 'x')]`,
# a whole-document XPath scan that calls back into Ruby for every element.
# With thousands of TOC anchors that was ~90% of the run. This gives the same
# answer (some element has an id or name attribute exactly equal to the
# fragment) from a set of the document's id and name values, built once per
# target document.
module FastFragmentLookup
  private

  def find_fragments(fragment_ids, html)
    unless @fragment_doc.equal?(html)
      @fragment_doc = html
      @fragment_set = html.xpath("//@id | //@name").to_set(&:value)
    end
    fragment_ids.any? { |id| @fragment_set.include?(id) } ? [true] : []
  end
end
# Written against html-proofer 5.x; on any other version keep its own lookup.
if HTMLProofer::VERSION.start_with?("5.") &&
   HTMLProofer::UrlValidator::Internal.private_method_defined?(:find_fragments)
  HTMLProofer::UrlValidator::Internal.prepend(FastFragmentLookup)
else
  warn "html-proofer #{HTMLProofer::VERSION}: fast anchor lookup not applied"
end

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
