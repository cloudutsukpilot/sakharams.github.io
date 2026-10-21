# frozen_string_literal: true

require "cgi"

# Builds the interview question index from every post with `interview_domain:` front matter, using the
# domains in _data/interview_index.yml, and exposes it to Liquid as `site.data.interview_questions`.
# Rendered by _includes/interview-index.html on the tag page named by `tag:` in that data file as
# domain → topic → one card per (kind, level), e.g. "Beginner" or "Scenario · Advanced".
#
# A question is a top-level numbered list item ("1. ...") outside code fences, under the nearest
# ##–#### heading. Each question gets a domain, topic, kind (theory | scenario) and level
# (beginner | intermediate | advanced | expert), resolved in this order, later wins:
#   1. the post: interview_domain, interview_topic, interview_level (default intermediate), kind theory
#   2. the heading: a level word ("Basic", "Scenarios: Expert") sets the level; "scenario" sets the kind
#   3. interview_sections: { "<heading text>": { domain, topic, kind, level, questions: { <n>: {...} } } }
#
# Before rendering, each question and its answer (the lines up to the next question or heading) are
# rewritten in the post's content as a collapsible card: <details class="iq-card" id="q-..."> whose
# <summary> is the question, so the index can link straight to it. A question with no answer becomes a
# plain card. Cards are styled in _sass/interview-index.scss; _includes/interview-qa.html adds
# expand/collapse-all and opens the card named in the URL hash. Each section with questions gets an
# anchor (<div id="iq-sec-...">) above its heading, and the post gets `page.iq_tiles` (topic → level →
# section link) for _includes/interview-tiles.html. The source files are not changed.
module InterviewIndex
  HEADING = /\A(\#{2,4})\s+(.+?)\s*\z/
  QUESTION = /\A(\d+)\.\s+(.+?)\s*\z/
  FENCE = /\A\s*(```|~~~)/
  ANCHOR_CLASS = "iq-anchor"
  TOOLBAR = "{% include interview-qa.html %}\n\n"
  LEVELS = %w[beginner intermediate advanced expert].freeze
  KINDS = %w[theory scenario].freeze
  LEVEL_WORDS = [
    [/\b(beginner|basic)/i, "beginner"],
    [/\bintermediate/i, "intermediate"],
    [/\badvanced/i, "advanced"],
    [/\bexpert/i, "expert"]
  ].freeze

  module_function

  # Strips Markdown emphasis, code ticks and links so the question reads as plain text.
  def plain(text)
    text.gsub(/\[([^\]]*)\]\([^)]*\)/, '\1')
        .gsub(/\*\*|__|`/, "")
        .gsub(/\s+/, " ")
        .strip
  end

  def level_label(level, kind)
    label = level.capitalize
    kind == "scenario" ? "Scenario · #{label}" : label
  end

  # Domain, topic, kind and level a heading gives its questions (see the header comment). A ###/####
  # section first takes the interview_sections mapping of its ## parent, so one entry on the parent
  # (e.g. "Kubernetes": { topic: Kubernetes }) covers its "Kubernetes: Beginner" … subsections.
  def section_attrs(doc, title, parent = nil)
    data = doc.data
    sections = Hash(data["interview_sections"])
    attrs = {
      "domain" => (data["interview_domain"] || data["interview_role"]).to_s,
      "topic" => (data["interview_topic"] || data["title"]).to_s,
      "kind" => "theory",
      "level" => (data["interview_level"] || "intermediate").to_s
    }
    attrs.merge!(Hash(sections[parent]).slice("domain", "topic", "kind", "level").transform_values(&:to_s)) if parent
    LEVEL_WORDS.each do |re, id|
      next unless title.match?(re)

      attrs["level"] = id
      break
    end
    attrs["kind"] = "scenario" if title.match?(/scenario/i)
    override = sections[title] || {}
    attrs.merge!(override.slice("domain", "topic", "kind", "level").transform_values(&:to_s))
    [attrs, Hash(override["questions"]).transform_keys(&:to_s)]
  end

  # Tiles for _includes/interview-tiles.html: one entry per topic (in order of appearance), each with one
  # group per level linking to the first section that holds that topic's questions at that level.
  def tiles(questions)
    topics = questions.group_by { |q| q["topic"] }
    topics.map do |name, qs|
      groups = qs.group_by { |q| q["level"] }.sort_by { |level, _| LEVELS.index(level) || LEVELS.size }
      {
        "name" => name,
        "count" => qs.size,
        "url" => "##{qs.first['section_id']}",
        "groups" => groups.map do |level, list|
          { "level" => level, "label" => level.capitalize, "count" => list.size,
            "scenarios" => list.count { |q| q["kind"] == "scenario" }, "url" => "##{list.first['section_id']}" }
        end
      }
    end
  end

  def check(doc, attrs)
    unless LEVELS.include?(attrs["level"]) && KINDS.include?(attrs["kind"])
      Jekyll.logger.warn "InterviewIndex:", "#{doc.relative_path}: bad level/kind #{attrs.inspect}"
    end
    attrs
  end

  # The question as inline HTML. A question wrapped entirely in backticks is unwrapped, so it reads as
  # text rather than code.
  def question_html(text, converter)
    text = Regexp.last_match(1) if text =~ /\A`([^`]+)`\z/
    return CGI.escapeHTML(text) unless converter

    converter.convert(text).strip.sub(/\A<p>/, "").sub(%r{</p>\z}, "")
  end

  # Answer lines lose the list-item indent (up to 4 spaces, taken from the first non-blank line), so they
  # parse as top-level Markdown inside the card. Relative indentation is kept.
  def dedent(lines)
    first = lines.find { |l| !l.strip.empty? }
    return lines unless first

    n = [first[/\A */].size, 4].min
    lines.map { |l| l.sub(/\A {0,#{n}}/, "") }
  end

  def render_card(card)
    body = dedent(card[:body])
    attrs = card[:attrs]
    classes = ["iq-card", ANCHOR_CLASS, "iq-level-#{attrs['level']}"]
    classes << "iq-kind-scenario" if attrs["kind"] == "scenario"
    classes = classes.join(" ")
    head = %(<span class="iq-num">#{card[:num]}</span><span class="iq-q">#{card[:html]}</span>) +
           %(<span class="iq-level">#{level_label(attrs['level'], attrs['kind'])}</span>)

    if body.all? { |l| l.strip.empty? }
      return %(\n<div class="#{classes} iq-card-plain" id="#{card[:id]}"><div class="iq-head">#{head}</div></div>\n\n)
    end

    %(\n<details class="#{classes}" id="#{card[:id]}" markdown="1">\n) +
      %(<summary markdown="0">#{head}</summary>\n\n) +
      body.join.sub(/\n*\z/, "\n") +
      %(\n</details>\n\n)
  end

  # Returns [questions, new_content] for one post. Each question is a hash with text, url, domain,
  # topic, kind and level.
  def parse(doc, converter = nil)
    questions = []
    title = "Questions"
    parent = nil
    attrs, per_q = section_attrs(doc, title)
    seen = Hash.new(0)
    section_ids = Hash.new(0)
    section_id = nil
    in_fence = false
    out = []
    card = nil
    heading_at = nil
    toolbar_at = nil

    close = lambda do
      next unless card

      out << render_card(card)
      card = nil
    end

    doc.content.lines.each do |line|
      stripped = line.chomp
      if stripped.match?(FENCE)
        in_fence = !in_fence
        (card ? card[:body] : out) << line
        next
      end
      if in_fence
        (card ? card[:body] : out) << line
        next
      end

      if (m = stripped.match(HEADING))
        close.call
        title = plain(m[2]).sub(/:\z/, "")
        if m[1].size == 2
          parent = title
          attrs, per_q = section_attrs(doc, title)
        else
          attrs, per_q = section_attrs(doc, title, parent)
        end
        heading_at = out.size
        section_id = nil
        out << line
        next
      end

      m = stripped.match(QUESTION)
      unless m
        (card ? card[:body] : out) << line
        next
      end

      close.call
      toolbar_at ||= heading_at || out.size
      # First question of a section: anchor the section (just above its heading) for the tiles.
      unless section_id
        base_id = "iq-sec-#{Jekyll::Utils.slugify(title)}"
        section_ids[base_id] += 1
        section_id = section_ids[base_id] == 1 ? base_id : "#{base_id}-#{section_ids[base_id]}"
        out.insert(heading_at || out.size, %(<div id="#{section_id}" class="#{ANCHOR_CLASS}"></div>\n\n))
      end
      base = "q-#{Jekyll::Utils.slugify(title)}-#{m[1]}"
      seen[base] += 1
      id = seen[base] == 1 ? base : "#{base}-#{seen[base]}"
      q_attrs = check(doc, attrs.merge(Hash(per_q[m[1]]).slice("domain", "topic", "kind", "level").transform_values(&:to_s)))
      questions << q_attrs.merge("text" => plain(m[2]), "url" => "#{doc.url}##{id}",
                                 "post_title" => doc.data["title"].to_s, "post_url" => doc.url,
                                 "section_id" => section_id)
      card = { id: id, num: m[1], html: question_html(m[2], converter), attrs: q_attrs, body: [] }
    end
    close.call

    out.insert(toolbar_at, TOOLBAR) if toolbar_at
    [questions, out.join]
  end

  def ordered(names, listed)
    listed = Array(listed)
    names.sort_by { |n| [listed.index(n) || listed.size, n.downcase] }
  end

  # domain config + its questions → { ..., topics: [{ name, slug, count, posts, groups }] }
  def build_domain(domain, questions)
    topics = questions.group_by { |q| q["topic"] }
    names = ordered(topics.keys, domain["topics"])
    built = names.map do |name|
      qs = topics[name]
      groups = KINDS.product(LEVELS).filter_map do |kind, level|
        list = qs.select { |q| q["kind"] == kind && q["level"] == level }
        next if list.empty?

        { "kind" => kind, "level" => level, "label" => level.capitalize,
          "count" => list.size, "questions" => list }
      end
      posts = qs.map { |q| { "title" => q["post_title"], "url" => q["post_url"] } }.uniq
      { "name" => name, "slug" => Jekyll::Utils.slugify("#{domain['id']} #{name}"),
        "count" => qs.size, "posts" => posts, "groups" => groups }
    end
    domain.merge("topics" => built, "count" => questions.size)
  end

  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      config = site.data["interview_index"]
      return unless config

      converter = site.find_converter_instance(Jekyll::Converters::Markdown)
      all = []
      site.posts.docs.each do |doc|
        next unless doc.data["interview_domain"] || doc.data["interview_role"]

        questions, content = InterviewIndex.parse(doc, converter)
        doc.content = content
        doc.data["iq_tiles"] = InterviewIndex.tiles(questions)
        all.concat(questions)
      end

      by_domain = all.group_by { |q| q["domain"] }
      domains = Array(config["domains"]).map do |domain|
        InterviewIndex.build_domain(domain, by_domain.delete(domain["id"].to_s) || [])
      end
      by_domain.each_key { |id| Jekyll.logger.warn "InterviewIndex:", "unknown interview domain '#{id}'" }

      site.data["interview_questions"] = {
        "tag_key" => Jekyll::Utils.slugify(config["tag"].to_s),
        "domains" => domains,
        "levels" => LEVELS,
        "count" => all.size - by_domain.values.sum(&:size)
      }
    end
  end
end
