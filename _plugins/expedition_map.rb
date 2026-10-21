# frozen_string_literal: true

require "cgi"

# Builds the Expedition Map tree (country › state › posts) from every post's `categories:`
# using the routes in _data/expedition_map.yml, and exposes it to Liquid as
# `site.data.expedition_atlas`. Rendered by _includes/expedition-map.html.
module ExpeditionMap
  UNCHARTED = {
    "id" => "uncharted",
    "name" => "Uncharted Territory",
    "icon" => "fas fa-question",
    "color" => "#94a3b8"
  }.freeze

  class Builder
    def initialize(config, baseurl: "")
      @countries = Array(config["countries"])
      @routes = (config["routes"] || {}).transform_keys { |k| k.to_s.downcase }
      @skip = Array(config["skip"]).map(&:downcase)
      @names = (config["names"] || {}).transform_keys(&:to_s)
      @baseurl = baseurl.to_s
    end

    # Returns {country:, state:, state_name:, state_category:, district:} for a post's categories,
    # or nil when the post is skipped. `override` is the post's optional `map: country/state`
    # front matter, for posts whose categories can't be changed without breaking their URL.
    def place(categories, override = nil)
      raw = Array(categories).map(&:to_s)
      path = raw.map(&:downcase)
      return nil if @skip.include?(path.first)

      if override
        country, state = override.to_s.split("/", 2)
        state ||= "general"
        return { country: country, state: state, state_name: name_for(state, nil),
                 state_category: raw.last || state, district: nil }
      end
      if path.empty?
        return { country: "uncharted", state: "uncategorized", state_name: "Uncategorized",
                 state_category: "uncategorized", district: nil }
      end

      length = path.length.downto(1).find { |n| @routes.key?(path.first(n).join("/")) }
      unless length
        return { country: "uncharted", state: slug(raw.first), state_name: title(raw.first),
                 state_category: raw.first, district: raw[1] }
      end

      country, state = @routes[path.first(length).join("/")].split("/", 2)
      if state
        { country: country, state: state, state_name: name_for(state, nil),
          state_category: raw[length - 1], district: raw[length] }
      elsif raw[length]
        { country: country, state: slug(raw[length]), state_name: name_for(slug(raw[length]), raw[length]),
          state_category: raw[length], district: raw[length + 1] }
      else
        { country: country, state: "general", state_name: name_for("general", nil),
          state_category: raw[length - 1], district: nil }
      end
    end

    def build(posts)
      countries = @countries.to_h { |c| [c["id"], c.merge("states" => {})] }
      countries["uncharted"] = UNCHARTED.merge("states" => {})

      posts.sort_by { |p| [-p.date.to_i, p.data["title"].to_s] }.each do |post|
        spot = place(post.data["categories"], post.data["map"])
        next unless spot

        country = countries.fetch(spot[:country]) do
          raise Jekyll::Errors::FatalException,
                "expedition_map.yml routes to unknown country '#{spot[:country]}'"
        end
        state = country["states"][spot[:state]] ||= {
          "id" => spot[:state], "name" => spot[:state_name],
          "url" => category_url(spot[:state_category]), "posts" => []
        }
        district = spot[:district] && name_for(slug(spot[:district]), spot[:district])
        state["posts"] << {
          "title" => post.data["title"].to_s, "url" => post.url,
          "date" => post.date.strftime("%Y-%m-%d"), "district" => district.to_s
        }
      end

      list = countries.values.map { |c| finish_country(c) }.reject { |c| c["count"].zero? }
      {
        "countries" => list,
        "posts" => list.sum { |c| c["count"] },
        "states" => list.sum { |c| c["states"].size },
        "uncharted" => list.find { |c| c["id"] == "uncharted" }&.dig("states")&.flat_map { |s| s["posts"] } || []
      }
    end

    private

    def finish_country(country)
      states = country["states"].values.map do |s|
        districts = s["posts"].map { |p| p["district"] }.reject(&:empty?).tally
        s.merge("count" => s["posts"].size,
                "districts" => districts.sort_by { |n, c| [-c, n] }.map { |n, c| { "name" => n, "count" => c } })
      end
      country.merge("states" => states.sort_by { |s| [-s["count"], s["name"]] },
                    "count" => states.sum { |s| s["count"] })
    end

    def category_url(name)
      "#{@baseurl}/categories/#{CGI.escape(Jekyll::Utils.slugify(name.to_s))}/"
    end

    def slug(name)
      Jekyll::Utils.slugify(name.to_s)
    end

    def name_for(slug, raw)
      @names[slug] || title(raw || slug)
    end

    # "build-tools" -> "Build Tools", "DeepLearning" -> "Deep Learning", "OWASP" stays.
    def title(raw)
      raw.to_s.gsub(/([a-z])([A-Z])/, '\1 \2').tr("-_", "  ").split.map do |word|
        word == word.upcase ? word : word.capitalize
      end.join(" ")
    end
  end

  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      config = site.data["expedition_map"]
      return unless config

      site.data["expedition_atlas"] = Builder.new(config, baseurl: site.baseurl).build(site.posts.docs)
    end
  end
end
