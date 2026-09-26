IMG = '<div class="blog-details-content-inner-img">\n<img src="https://themexriver.com/wp/choicy/wp-content/uploads/2024/01/inner-img-1.jpg" alt="{alt}">\n</div>'

def P(t): return f'<p class="chy-para-1 disc">{t}</p>\n\n'
def H(t): return f'<h2 class="chy-heading-1 subtitle chy-split-in-right chy-split-text">{t}</h2>\n\n'
def Q(t): return f'<blockquote class="blog-details-blockquote-1">\n{t}\n</blockquote>\n\n'
def L(items, alt):
    lis = "\n".join(f'<li><i class="flaticon2-double-tick-indicator"></i>{i}</li>' for i in items)
    return ('<div class="inner-div mb-30">\n<ul class="blog-details-content-list list-unstyled pl-0 mb-0">\n'
            + lis + '\n</ul>\n' + IMG.format(alt=alt) + '\n</div>\n\n')

CTA = P('Want to know how AI assistants describe your business today? Marvice Media offers a free AI visibility check from our offices in Bengaluru (Koramangala) and Chennai (Nungambakkam). Call +91 80562 91930 or email info@marvice.in, or read about our <a href="https://marvice.in/our-services/onscreens/generative-engine-optimization/">Generative Engine Optimization service</a>.')

ARTICLES = {
1181: dict(
 title="What Is Generative Engine Optimization (GEO)? A Guide for Indian Businesses",
 slug="what-is-generative-engine-optimization",
 cats=[18, 19],
 excerpt="Generative engine optimization (GEO) makes your brand easy for ChatGPT, Gemini, Perplexity and Google AI Overviews to find, trust and cite. Here is how it works.",
 card="GEO makes your brand easy for ChatGPT, Gemini and Google AI Overviews to find, trust and cite.",
 content=
 P("Generative engine optimization (GEO) is the practice of making a business easy for AI assistants such as ChatGPT, Google AI Overviews, Gemini, Perplexity, Claude and Microsoft Copilot to find, understand and cite. Where traditional SEO aims to rank a page in Google's list of links, GEO aims to get your brand named inside the answer an AI writes, which is often the only thing the searcher reads.")
 + Q("If an AI assistant can't clearly tell who you are, what you do and where you operate, it won't recommend you, however good your service is.")
 + P("AI assistants build answers from sources they can crawl and trust. They favour businesses that are described consistently across the web, publish clear factual pages, and are mentioned by independent sites. GEO works on all three.")
 + L(["Technical access: AI crawlers such as GPTBot, ClaudeBot and PerplexityBot can reach your pages, and an llms.txt file summarises your business",
      "Entity data: Organization, LocalBusiness, Service and FAQ schema, plus an identical name, address and phone on every profile",
      "Citable content: short, self-contained answers, definitions and facts that an AI can quote directly",
      "Brand mentions: listings, reviews, press and \"best of\" articles that AI models use to decide whom to recommend"],
     "Checklist of generative engine optimization foundations")
 + H("How GEO Differs From SEO")
 + P("SEO and GEO share foundations: a fast, crawlable site and trustworthy content. The difference is the goal. SEO earns a position in a results page; GEO earns a mention in a generated answer. Google's AI Overviews and ChatGPT search draw heavily on pages that already rank and are well structured, so the best results come from running both together rather than choosing one.")
 + H("Where Indian Businesses Should Start")
 + P("Start with a GEO audit: ask the AI assistants the questions your customers ask, such as \"best digital marketing agency in Bengaluru\" or \"corporate gifting company in Chennai\", and record who gets named. Then fix the basics that most sites miss: remove leftover demo or thin pages, add structured data, make your address and phone identical everywhere, and rewrite your key service pages so each opens with a clear, factual summary.")
 + CTA),
1179: dict(
 title="GEO vs SEO: Which Search Strategy Is Right for Your Business in 2026?",
 slug="geo-vs-seo",
 cats=[18, 19],
 excerpt="GEO vs SEO explained: what each one optimises for, where they overlap, and how Indian businesses should split effort between Google rankings and AI citations.",
 card="What SEO and GEO each optimise for, and how to balance Google rankings with AI citations.",
 content=
 P("Search now happens in two places: the classic Google results page and AI-generated answers from ChatGPT, Gemini, Perplexity and Google's own AI Overviews. Search engine optimization (SEO) targets the first; generative engine optimization (GEO) targets the second. Most businesses need both, but in different proportions.")
 + Q("SEO gets you a place in the list of links. GEO gets your name into the answer.")
 + P("SEO is measured in rankings, clicks and organic leads. GEO is measured in how often, and how accurately, AI assistants mention your brand for the questions your buyers ask. The two reinforce each other: strong, well-structured pages that rank on Google are also the pages AI systems most often cite.")
 + L(["Shared foundations: crawlable site, fast pages, clear site structure, trustworthy content",
      "SEO emphasis: keyword targeting, backlinks, on-page optimisation, local pack rankings",
      "GEO emphasis: structured data, consistent entity information, quotable answer-style content, third-party mentions",
      "Measurement: rankings and traffic for SEO; prompt-level brand mentions and citations for GEO"],
     "Comparison of SEO and GEO priorities")
 + H("How to Split Your Effort")
 + P("If your site has technical problems, missing meta descriptions or thin pages, fix SEO fundamentals first; GEO depends on them. If you already rank but competitors are the ones named in AI answers, shift effort to GEO: structured data, FAQ content, directory and review coverage, and getting featured in industry roundups. For local businesses in Bengaluru and Chennai, a complete Google Business Profile helps both at once.")
 + CTA),
1177: dict(
 title="How to Get Your Business Recommended by ChatGPT and Google AI Overviews",
 slug="get-recommended-by-chatgpt-and-google-ai-overviews",
 cats=[17, 18],
 excerpt="Practical steps to get your business named in ChatGPT, Gemini, Perplexity and Google AI Overviews answers, from structured data to reviews and listicles.",
 card="Practical steps to get your business named in ChatGPT, Gemini and Google AI Overviews answers.",
 content=
 P("When someone asks ChatGPT or Google's AI Overview for \"the best event management company in Bengaluru\" or \"a reliable software company in Chennai\", the assistant names a handful of businesses. Getting onto that shortlist is not luck. AI systems favour brands they can identify clearly and see recommended by others.")
 + Q("AI assistants recommend the businesses that are easiest to verify, not necessarily the biggest.")
 + P("Work through these steps in order. Each one makes your business easier for an AI model to recognise, trust and cite.")
 + L(["Let AI crawlers in: check robots.txt allows GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot and Google-Extended",
      "Publish llms.txt: a plain-text summary of who you are, where you operate and your key service pages",
      "Add structured data: Organization and LocalBusiness schema with address, phone, logo and social profiles",
      "Keep NAP identical: the same name, address and phone on your site, Google Business Profile and every directory",
      "Write answer-first pages: open each service page with a clear two-sentence summary and add real FAQs",
      "Earn mentions: reviews, directories such as Clutch and GoodFirms, press, and \"best of\" lists in your city"],
     "Steps to get recommended by AI assistants")
 + H("Track It Like a Ranking")
 + P("Make a list of 15 to 20 questions your customers ask and check each month how ChatGPT, Gemini and Perplexity answer them. Note whether you are mentioned, how you are described and which sources are cited. Those cited sources show exactly where to earn your next mention.")
 + CTA),
1169: dict(
 title="Social Media Marketing Strategies for Small Businesses in Bengaluru and Chennai",
 slug="social-media-marketing-strategies-for-small-business",
 cats=[16, 18],
 excerpt="Proven social media marketing strategies for small businesses in Bengaluru and Chennai: platform choice, content mix, local targeting and measuring enquiries.",
 card="Proven social media tactics small businesses can use to grow reach, engagement and enquiries.",
 content=
 P("For small businesses, social media is often the cheapest way to reach local customers, but only with a clear plan. The businesses that grow on Instagram, Facebook, LinkedIn and YouTube pick the right platforms, post consistently and measure enquiries rather than likes.")
 + Q("Choose two platforms you can do well rather than five you do badly.")
 + P("Restaurants, cafes, salons and retail brands usually get the best return from Instagram and Facebook, with short-form video. B2B services and agencies do better on LinkedIn. Education and product brands benefit from YouTube tutorials that keep working for months.")
 + L(["Local targeting: geo-tag posts and run ads to specific Bengaluru and Chennai neighbourhoods",
      "Content mix: behind-the-scenes, customer stories, offers and useful how-to posts",
      "Consistency: a simple weekly calendar beats occasional bursts of activity",
      "Social proof: reshare reviews and tag happy customers with their permission",
      "Measurement: track calls, WhatsApp messages and bookings from each platform, not just followers"],
     "Social media marketing checklist for small businesses")
 + H("Connect Social Media to Search")
 + P("Social profiles are also signals that search engines and AI assistants use to confirm who you are. Keep your business name, address and phone identical on every profile, link back to your website, and make sure your website links to your profiles. That consistency helps you appear in Google's local results and in AI-generated recommendations.")
 + P("Need a social media plan that brings in enquiries? Marvice Media's Onscreens team plans, creates and manages social media for businesses in Bengaluru and Chennai. Call +91 80562 91930 or email info@marvice.in.")),
}
