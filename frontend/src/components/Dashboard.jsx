import { useMemo } from "react";
import { TrendingUp, TrendingDown, Flame, Gem, Factory, Wheat, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const categoryIcons = {
  energy: Flame,
  precious_metals: Gem,
  industrial_metals: Factory,
  agriculture: Wheat,
};

const categoryColors = {
  energy: "#FF4500",
  precious_metals: "#D4AF37",
  industrial_metals: "#3B82F6",
  agriculture: "#00FF94",
};

const generateMiniChart = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    value: 50 + Math.random() * 30 + (i * 0.5),
  }));
};

export const Dashboard = ({ commodities, marketSummary, loading }) => {
  const groupedCommodities = useMemo(() => {
    const groups = {};
    commodities.forEach((c) => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, [commodities]);

  if (loading) {
    return (
      <div className="bento-grid" data-testid="dashboard-loading">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="col-span-3">
            <Skeleton className="h-40 bg-[#18181B]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Market Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass-card border-0 col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg text-[#FAFAFA]">Top Gainers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {marketSummary?.top_gainers?.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#00FF94]/5 border border-[#00FF94]/20">
                <div>
                  <p className="font-heading font-semibold text-[#FAFAFA]">{item.name}</p>
                  <p className="font-data text-xs text-[#A1A1AA]">{item.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="font-data text-lg text-[#FAFAFA]">${item.price}</p>
                  <p className="font-data text-sm text-[#00FF94] flex items-center justify-end gap-1">
                    <ArrowUpRight size={14} />
                    +{item.change_percent.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card border-0 col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg text-[#FAFAFA]">Top Losers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {marketSummary?.top_losers?.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#FF0055]/5 border border-[#FF0055]/20">
                <div>
                  <p className="font-heading font-semibold text-[#FAFAFA]">{item.name}</p>
                  <p className="font-data text-xs text-[#A1A1AA]">{item.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="font-data text-lg text-[#FAFAFA]">${item.price}</p>
                  <p className="font-data text-sm text-[#FF0055] flex items-center justify-end gap-1">
                    <ArrowDownRight size={14} />
                    {item.change_percent.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Category Sections */}
      {Object.entries(groupedCommodities).map(([category, items]) => {
        const Icon = categoryIcons[category] || Gem;
        const color = categoryColors[category];
        
        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <h2 className="font-heading font-bold text-xl text-[#FAFAFA] uppercase tracking-wide">
                {category.replace('_', ' ')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((commodity) => {
                const chartData = generateMiniChart();
                const isPositive = commodity.change_percent >= 0;

                return (
                  <Card
                    key={commodity.symbol}
                    className="glass-card border-0 hover:gold-glow transition-all duration-300 cursor-pointer group"
                    data-testid={`commodity-card-${commodity.symbol}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-data text-xs text-[#52525B] mb-1">{commodity.symbol}</p>
                          <p className="font-heading font-semibold text-[#FAFAFA] group-hover:text-[#D4AF37] transition-colors">
                            {commodity.name}
                          </p>
                        </div>
                        <div className={`p-1.5 rounded ${isPositive ? 'bg-[#00FF94]/10' : 'bg-[#FF0055]/10'}`}>
                          {isPositive ? (
                            <TrendingUp size={16} className="text-[#00FF94]" />
                          ) : (
                            <TrendingDown size={16} className="text-[#FF0055]" />
                          )}
                        </div>
                      </div>

                      <div className="h-16 mb-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id={`gradient-${commodity.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={isPositive ? '#00FF94' : '#FF0055'} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={isPositive ? '#00FF94' : '#FF0055'} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={isPositive ? '#00FF94' : '#FF0055'}
                              strokeWidth={1.5}
                              fill={`url(#gradient-${commodity.symbol})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="font-data text-2xl font-bold text-[#FAFAFA]">
                            ${commodity.price?.toFixed(2)}
                          </p>
                          <p className={`font-data text-sm ${isPositive ? 'text-[#00FF94]' : 'text-[#FF0055]'}`}>
                            {isPositive ? '+' : ''}{commodity.change?.toFixed(2)} ({isPositive ? '+' : ''}{commodity.change_percent?.toFixed(2)}%)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#52525B]">H: <span className="font-data text-[#A1A1AA]">${commodity.high?.toFixed(2)}</span></p>
                          <p className="text-xs text-[#52525B]">L: <span className="font-data text-[#A1A1AA]">${commodity.low?.toFixed(2)}</span></p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
