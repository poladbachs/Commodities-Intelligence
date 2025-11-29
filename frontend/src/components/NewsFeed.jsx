import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { ExternalLink, Clock, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const NewsFeed = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const params = category !== "all" ? { category, limit: 15 } : { limit: 15 };
        const res = await axios.get(`${API}/news`, { params });
        setNews(res.data.articles || []);
      } catch (e) {
        console.error("Error fetching news:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [category]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6" data-testid="news-feed">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold text-[#FAFAFA] tracking-tight">Market News</h1>
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-[#52525B]" />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48 bg-[#121214] border-[#27272A]" data-testid="news-category-select">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent className="bg-[#121214] border-[#27272A]">
              <SelectItem value="all" className="text-[#FAFAFA] focus:bg-[#27272A]">All News</SelectItem>
              <SelectItem value="energy" className="text-[#FAFAFA] focus:bg-[#27272A]">Energy</SelectItem>
              <SelectItem value="precious_metals" className="text-[#FAFAFA] focus:bg-[#27272A]">Precious Metals</SelectItem>
              <SelectItem value="industrial_metals" className="text-[#FAFAFA] focus:bg-[#27272A]">Industrial Metals</SelectItem>
              <SelectItem value="agriculture" className="text-[#FAFAFA] focus:bg-[#27272A]">Agriculture</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 bg-[#18181B]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {news.map((article, i) => (
            <Card
              key={i}
              className="glass-card border-0 hover:border-[#D4AF37]/30 transition-all duration-300 group cursor-pointer"
              data-testid={`news-article-${i}`}
            >
              <CardContent className="p-0">
                <div className="flex gap-4 p-4">
                  {article.image_url && (
                    <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={article.image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="border-[#D4AF37]/50 text-[#D4AF37] text-xs">
                        {article.source}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-[#52525B]">
                        <Clock size={12} />
                        {formatDate(article.published_at)}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-[#FAFAFA] mb-2 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-[#A1A1AA] line-clamp-2">
                      {article.description}
                    </p>
                  </div>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 border-t border-[#27272A] text-sm text-[#A1A1AA] hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all"
                >
                  Read Full Article <ExternalLink size={14} />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && news.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#52525B]">No news articles found</p>
        </div>
      )}
    </div>
  );
};
