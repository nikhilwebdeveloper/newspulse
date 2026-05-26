import { useState, useEffect, useCallback } from "react";

// ── Real RSS Feeds (all free, commercial OK) ──────────────────────────────────
const FEEDS = {
  All: [
    {
      url: "https://techcrunch.com/feed/",
      source: "TechCrunch",
      category: "Tech",
    },
    {
      url: "https://www.theverge.com/rss/index.xml",
      source: "The Verge",
      category: "Tech",
    },
    {
      url: "https://feeds.arstechnica.com/arstechnica/index",
      source: "Ars Technica",
      category: "Tech",
    },
    {
      url: "https://www.wired.com/feed/rss",
      source: "Wired",
      category: "Tech",
    },
  ],
  AI: [
    {
      url: "https://techcrunch.com/category/artificial-intelligence/feed/",
      source: "TechCrunch",
      category: "AI",
    },
    {
      url: "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml",
      source: "The Verge",
      category: "AI",
    },
  ],
  Gadgets: [
    {
      url: "https://www.theverge.com/gadgets/rss/index.xml",
      source: "The Verge",
      category: "Gadgets",
    },
    {
      url: "https://techcrunch.com/gadgets/feed/",
      source: "TechCrunch",
      category: "Gadgets",
    },
  ],
  Startups: [
    {
      url: "https://techcrunch.com/startups/feed/",
      source: "TechCrunch",
      category: "Startups",
    },
    {
      url: "https://techcrunch.com/venture/feed/",
      source: "TechCrunch",
      category: "Startups",
    },
  ],
  Cybersecurity: [
    {
      url: "https://feeds.arstechnica.com/arstechnica/security",
      source: "Ars Technica",
      category: "Cybersecurity",
    },
    {
      url: "https://techcrunch.com/category/security/feed/",
      source: "TechCrunch",
      category: "Cybersecurity",
    },
  ],
  Space: [
    {
      url: "https://www.theverge.com/space/rss/index.xml",
      source: "The Verge",
      category: "Space",
    },
    {
      url: "https://techcrunch.com/space/feed/",
      source: "TechCrunch",
      category: "Space",
    },
  ],
};

const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

// ── Parse rss2json JSON response into article objects ─────────────────────────
function parseFeed(
  items: any[] = [],
  source: string,
  category: string
) {
  return items.slice(0, 8).map((item, idx) => {
    const rawDesc = item.description || item.content || "";

    // Thumbnail: rss2json gives thumbnail directly; fallback to enclosure or first <img>
    let thumbnail = item.thumbnail || "";
    if (!thumbnail && item.enclosure?.link) thumbnail = item.enclosure.link;
    if (!thumbnail && rawDesc) {
      const m = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m) thumbnail = m[1];
    }

    const pubDate = item.pubDate || new Date().toISOString();

    return {
      id: item.guid || item.link || `${source}-${idx}`,
      title: item.title || "",
      summary: stripHtml(rawDesc),
      link: item.link || "",
      thumbnail,
      time: timeAgo(pubDate),
      readTime: readTime(rawDesc),
      source,
      category,
      pubDate: new Date(pubDate),
    };
  });
}

const CAT_COLORS = {
  All: { bg: "#e8f4ff", text: "#1a6fc4", border: "#b3d4f5" },
  AI: { bg: "#edf6ff", text: "#1558b0", border: "#a8c9f0" },
  Gadgets: { bg: "#fff4ed", text: "#c04b00", border: "#ffc89e" },
  Startups: { bg: "#f3edff", text: "#6b21a8", border: "#d8b4fe" },
  Cybersecurity: { bg: "#fff0f2", text: "#b91c3b", border: "#fda4af" },
  Space: { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  Tech: { bg: "#e8f4ff", text: "#1a6fc4", border: "#b3d4f5" },
};

const CAT_EMOJI = {
  All: "📰",
  AI: "🤖",
  Gadgets: "📱",
  Startups: "🚀",
  Cybersecurity: "🔒",
  Space: "🌌",
  Tech: "💻",
};

const CATEGORIES = [
  "All",
  "AI",
  "Gadgets",
  "Startups",
  "Cybersecurity",
  "Space",
];

// Strip HTML tags from RSS description
function stripHtml(html = "") {
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&[a-z]+;/g, " ")
      .trim()
      .slice(0, 160) + "..."
  );
}

// Friendly time ago
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} days ago`;
}

// Estimate read time from description length
function readTime(desc = "") {
  const words = desc.split(" ").length;
  return `${Math.max(2, Math.ceil(words / 200))} min read`;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ category }: { category: string }) {
  const c = CAT_COLORS[category as keyof typeof CAT_COLORS] || CAT_COLORS["All"];
  return (
    <span
      style={{
        display: "inline-block",
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: "700",
        padding: "2px 9px",
      }}
    >
      {CAT_EMOJI[category as keyof typeof CAT_EMOJI] || "📰"} {category}
    </span>
  );
}

// ── News Card ─────────────────────────────────────────────────────────────────
function NewsCard({ article }: any) {
  const [hovered, setHovered] = useState(false);
  return (
    <article
      onClick={() => window.open(article.link, "_blank")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: `1px solid ${hovered ? "#93c5fd" : "#e8eaed"}`,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
        boxShadow: hovered
          ? "0 6px 24px rgba(59,130,246,0.1)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "none",
        animation: "fadeUp 0.35s ease both",
        display: "flex",
        gap: "16px",
      }}
    >
      {/* Thumbnail */}
      {article.thumbnail && (
        <img
          src={article.thumbnail}
          alt=""
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          style={{
            width: "100px",
            height: "72px",
            borderRadius: "10px",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
            flexWrap: "wrap",
          }}
        >
          <Badge category={article.category} />
          <span
            style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}
          >
            📌 {article.source}
          </span>
        </div>

        <h3
          style={{
            fontSize: "15px",
            fontWeight: "700",
            color: hovered ? "#1d4ed8" : "#0f172a",
            lineHeight: "1.45",
            marginBottom: "7px",
            fontFamily: "'Playfair Display', serif",
            transition: "color 0.2s",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {article.title}
        </h3>

        <p
          style={{
            fontSize: "13px",
            color: "#64748b",
            lineHeight: "1.6",
            marginBottom: "10px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {article.summary}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            {article.time}
          </span>
          <span style={{ color: "#cbd5e1" }}>·</span>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            ⏱ {article.readTime}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "13px",
              color: "#3b82f6",
              fontWeight: "600",
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.2s",
            }}
          >
            Read more →
          </span>
        </div>
      </div>
    </article>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: "1px solid #e8eaed",
        padding: "20px 22px",
        display: "flex",
        gap: "16px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    >
      <div
        style={{
          width: "100px",
          height: "72px",
          background: "#f1f5f9",
          borderRadius: "10px",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            width: "80px",
            height: "20px",
            background: "#f1f5f9",
            borderRadius: "6px",
            marginBottom: "10px",
          }}
        />
        <div
          style={{
            width: "95%",
            height: "16px",
            background: "#f1f5f9",
            borderRadius: "6px",
            marginBottom: "6px",
          }}
        />
        <div
          style={{
            width: "75%",
            height: "16px",
            background: "#f1f5f9",
            borderRadius: "6px",
            marginBottom: "10px",
          }}
        />
        <div
          style={{
            width: "50%",
            height: "12px",
            background: "#f8fafc",
            borderRadius: "6px",
          }}
        />
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function TechPulse() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchNews = useCallback(async (category: string) => {
    setLoading(true);
    setError("");

    const feeds = FEEDS[category as keyof typeof FEEDS] || FEEDS["All"];
    const results: any[] = [];

    await Promise.all(
      feeds.map(async ({ url, source, category: cat }) => {
        try {
          const apiUrl = `${RSS2JSON}${encodeURIComponent(url)}&count=8`;
          const res = await fetch(apiUrl);
          if (!res.ok) return;
          const data = await res.json();
          if (data.status === "ok" && Array.isArray(data.items)) {
            results.push(...parseFeed(data.items, source, cat));
          }
        } catch {
          /* skip failed feed silently */
        }
      })
    );

    if (results.length === 0) {
      setError("Could not load news right now. Please try again.");
    } else {
      const seen = new Set();
      const unique = results
        .sort((a, b) => b.pubDate - a.pubDate)
        .filter((n) => {
          if (!n.title || seen.has(n.title)) return false;
          seen.add(n.title);
          return true;
        })
        .slice(0, 12);
      setNews(unique);
      setLastUpdated(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNews("All");
  }, []);

  const handleCategory = (cat) => {
    setActiveCategory(cat);
    fetchNews(cat);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Manrope:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f6f9; font-family: 'Manrope', sans-serif; color: #0f172a; }

        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .cat-btn {
          border: none; cursor: pointer; border-radius: 10px;
          font-family: 'Manrope', sans-serif; font-weight: 600;
          font-size: 13px; padding: 8px 16px;
          transition: all 0.18s ease; white-space: nowrap;
        }
        .cat-btn:hover { transform: translateY(-1px); }

        @media (max-width: 900px) {
          .main-grid { grid-template-columns: 1fr !important; }
          .sidebar   { display: none !important; }
        }
        @media (max-width: 600px) {
          .page-wrap  { padding: 16px 12px 32px !important; }
          .header-pad { padding: 12px 14px !important; }
          .nav-area   { padding: 0 14px 10px !important; }
          .ad-top     { display: none !important; }
          .news-thumb { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f4f6f9" }}>
        {/* Top Ad Banner */}
        <div
          className="ad-top"
          style={{
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
            textAlign: "center",
            padding: "10px",
            fontSize: "12px",
            color: "#94a3b8",
          }}
        >
          [ Advertisement — 728×90 — Google AdSense ]
        </div>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header
          style={{
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
            position: "sticky",
            top: 0,
            zIndex: 100,
            boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="header-pad"
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                }}
              >
                ⚡
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Playfair Display',serif",
                    fontSize: "22px",
                    fontWeight: "800",
                    lineHeight: 1,
                  }}
                >
                  TechPulse
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#94a3b8",
                    fontWeight: "500",
                    marginTop: "1px",
                  }}
                >
                  Real Tech News · Live RSS
                </div>
              </div>
            </div>

            {/* Right */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#22c55e",
                    animation: "blink 2s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    fontWeight: "600",
                  }}
                >
                  Live
                </span>
              </div>

              {lastUpdated && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  🕐{" "}
                  {lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}

              <button
                onClick={() => fetchNews(activeCategory)}
                disabled={loading}
                style={{
                  background: loading ? "#f1f5f9" : "#3b82f6",
                  color: loading ? "#94a3b8" : "#fff",
                  border: "none",
                  borderRadius: "9px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: loading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "'Manrope',sans-serif",
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    animation: loading ? "spin 0.8s linear infinite" : "none",
                  }}
                >
                  🔄
                </span>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Category nav */}
          <div
            className="nav-area"
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "0 24px 12px",
              display: "flex",
              gap: "8px",
              overflowX: "auto",
            }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = cat === activeCategory;
              const c = CAT_COLORS[cat];
              return (
                <button
                  key={cat}
                  className="cat-btn"
                  onClick={() => handleCategory(cat)}
                  style={{
                    background: isActive ? c.bg : "transparent",
                    color: isActive ? c.text : "#64748b",
                    border: `1px solid ${isActive ? c.border : "#e2e8f0"}`,
                  }}
                >
                  {CAT_EMOJI[cat]} {cat}
                </button>
              );
            })}
          </div>
        </header>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <div
          className="page-wrap"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "24px 24px 40px",
          }}
        >
          {/* Section header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "800" }}>
                {activeCategory === "All"
                  ? "Latest Stories"
                  : `${CAT_EMOJI[activeCategory]} ${activeCategory} News`}
              </h2>
              {!loading && news.length > 0 && (
                <span
                  style={{
                    background: "#e0f2fe",
                    color: "#0369a1",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "700",
                    padding: "2px 10px",
                  }}
                >
                  {news.length} stories
                </span>
              )}
            </div>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Sources: TechCrunch · The Verge · Wired · Ars Technica
            </span>
          </div>

          {/* Grid */}
          <div
            className="main-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 300px",
              gap: "24px",
              alignItems: "start",
            }}
          >
            {/* News Feed */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {error ? (
                <div
                  style={{
                    background: "#fff0f2",
                    border: "1px solid #fda4af",
                    borderRadius: "14px",
                    padding: "32px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "10px" }}>
                    ⚠️
                  </div>
                  <p
                    style={{
                      color: "#b91c3b",
                      fontWeight: "600",
                      marginBottom: "12px",
                    }}
                  >
                    {error}
                  </p>
                  <button
                    onClick={() => fetchNews(activeCategory)}
                    style={{
                      background: "#b91c3b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "9px",
                      padding: "8px 20px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontFamily: "'Manrope',sans-serif",
                    }}
                  >
                    Try Again
                  </button>
                </div>
              ) : loading ? (
                [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} />)
              ) : (
                news.map((article, i) => (
                  <div
                    key={article.id || i}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <NewsCard article={article} />
                  </div>
                ))
              )}
            </div>

            {/* Sidebar */}
            <div
              className="sidebar"
              style={{ display: "flex", flexDirection: "column", gap: "18px" }}
            >
              {/* Ad */}
              <div
                style={{
                  background: "#fff",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "14px",
                  padding: "28px 16px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    fontWeight: "600",
                    marginBottom: "8px",
                    letterSpacing: "0.5px",
                  }}
                >
                  ADVERTISEMENT
                </div>
                <div
                  style={{
                    width: "260px",
                    height: "260px",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                    color: "#94a3b8",
                    fontSize: "13px",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "30px" }}>📢</span>
                  <span>Google AdSense</span>
                  <span style={{ fontSize: "11px", color: "#cbd5e1" }}>
                    250 × 250
                  </span>
                </div>
              </div>

              {/* Top Sources */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "20px",
                }}
              >
                <h3
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "#0f172a",
                    marginBottom: "14px",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  📡 Our Sources
                </h3>
                {[
                  { name: "TechCrunch", emoji: "🔵", desc: "Startups & VC" },
                  { name: "The Verge", emoji: "🟣", desc: "Gadgets & Culture" },
                  { name: "Wired", emoji: "🟡", desc: "Science & Tech" },
                  {
                    name: "Ars Technica",
                    emoji: "🔴",
                    desc: "In-depth Analysis",
                  },
                ].map((s, i, arr) => (
                  <div
                    key={s.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 0",
                      borderBottom:
                        i < arr.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>{s.emoji}</span>
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "#1e293b",
                        }}
                      >
                        {s.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {s.desc}
                      </div>
                    </div>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: "10px",
                        color: "#22c55e",
                        fontWeight: "700",
                        background: "#f0fdf4",
                        padding: "2px 7px",
                        borderRadius: "20px",
                        border: "1px solid #86efac",
                      }}
                    >
                      LIVE
                    </span>
                  </div>
                ))}
              </div>

              {/* Newsletter */}
              <div
                style={{
                  background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
                  borderRadius: "14px",
                  padding: "22px 18px",
                  textAlign: "center",
                  color: "#fff",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>📬</div>
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: "800",
                    marginBottom: "6px",
                  }}
                >
                  Daily Tech Digest
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    opacity: 0.85,
                    marginBottom: "14px",
                    lineHeight: "1.5",
                  }}
                >
                  Top stories every morning in your inbox. Free forever.
                </p>
                <input
                  placeholder="your@email.com"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "13px",
                    marginBottom: "10px",
                    fontFamily: "'Manrope',sans-serif",
                    outline: "none",
                  }}
                />
                <button
                  style={{
                    width: "100%",
                    padding: "9px",
                    background: "#fff",
                    color: "#1d4ed8",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontFamily: "'Manrope',sans-serif",
                  }}
                >
                  Subscribe Free →
                </button>
              </div>

              {/* Bottom ad */}
              <div
                style={{
                  background: "#fff",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "14px",
                  padding: "16px",
                  textAlign: "center",
                  fontSize: "11px",
                  color: "#94a3b8",
                }}
              >
                ADVERTISEMENT · 300×250
                <br />
                <span style={{ fontSize: "10px" }}>Google AdSense Slot</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer
          style={{
            background: "#1e293b",
            color: "#94a3b8",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: "20px",
              fontWeight: "800",
              color: "#fff",
              marginBottom: "8px",
            }}
          >
            ⚡ TechPulse
          </div>
          <p style={{ fontSize: "12px", marginBottom: "6px" }}>
            Real news from TechCrunch, The Verge, Wired & Ars Technica
          </p>
          <p
            style={{ fontSize: "11px", color: "#475569", marginBottom: "16px" }}
          >
            Powered by RSS feeds — always free, always real.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "20px",
              flexWrap: "wrap",
              fontSize: "12px",
              marginBottom: "14px",
            }}
          >
            {["About", "Privacy Policy", "Advertise with Us", "Contact"].map(
              (l) => (
                <span key={l} style={{ cursor: "pointer", color: "#64748b" }}>
                  {l}
                </span>
              )
            )}
          </div>
          <p style={{ fontSize: "11px", color: "#334155" }}>
            © 2026 TechPulse · All news belongs to respective publishers
          </p>
        </footer>
      </div>
    </>
  );
}
