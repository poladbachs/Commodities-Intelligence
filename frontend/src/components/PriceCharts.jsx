import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="font-data text-xs text-[#A1A1AA] mb-1">{label}</p>
        <p className="font-data text-sm text-[#FAFAFA]">Close: <span className="text-[#D4AF37]">${payload[0]?.value?.toFixed(2)}</span></p>
        {payload[0]?.payload?.high && (
          <>
            <p className="font-data text-xs text-[#52525B]">High: ${payload[0].payload.high.toFixed(2)}</p>
            <p className="font-data text-xs text-[#52525B]">Low: ${payload[0].payload.low.toFixed(2)}</p>
          </>
        )}
      </div>
    );
  }
  return null;
};

export const PriceCharts = ({ commodities }) => {
  const [selectedSymbol, setSelectedSymbol] = useState("XAU");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/commodities/${selectedSymbol}/history`, {
          params: { days: parseInt(timeRange) }
        });
        setHistoryData(res.data.history || []);
      } catch (e) {
        console.error("Error fetching history:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [selectedSymbol, timeRange]);

  const selectedCommodity = commodities.find(c => c.symbol === selectedSymbol);

  return (
    <div className="space-y-6" data-testid="price-charts">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold text-[#FAFAFA] tracking-tight">Price Charts</h1>
        <div className="flex gap-3">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-48 bg-[#121214] border-[#27272A]" data-testid="commodity-select">
              <SelectValue placeholder="Select commodity" />
            </SelectTrigger>
            <SelectContent className="bg-[#121214] border-[#27272A]">
              {commodities.map((c) => (
                <SelectItem key={c.symbol} value={c.symbol} className="text-[#FAFAFA] focus:bg-[#27272A]">
                  {c.name} ({c.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="glass-card border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-2xl text-[#FAFAFA]">
                {selectedCommodity?.name || selectedSymbol}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <span className="font-data text-3xl text-[#D4AF37]">
                  ${selectedCommodity?.price?.toFixed(2)}
                </span>
                <span className={`font-data text-lg ${selectedCommodity?.change_percent >= 0 ? 'text-[#00FF94]' : 'text-[#FF0055]'}`}>
                  {selectedCommodity?.change_percent >= 0 ? '+' : ''}{selectedCommodity?.change_percent?.toFixed(2)}%
                </span>
              </div>
            </div>
            <Tabs value={timeRange} onValueChange={setTimeRange}>
              <TabsList className="bg-[#18181B]">
                <TabsTrigger value="7" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">7D</TabsTrigger>
                <TabsTrigger value="30" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">30D</TabsTrigger>
                <TabsTrigger value="90" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">90D</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[400px] bg-[#18181B]" />
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    stroke="#52525B"
                    tick={{ fill: '#A1A1AA', fontSize: 11 }}
                    tickFormatter={(val) => val.slice(5)}
                  />
                  <YAxis
                    stroke="#52525B"
                    tick={{ fill: '#A1A1AA', fontSize: 11 }}
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    fill="url(#chartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {["open", "high", "low", "close"].map((key) => {
          const latestData = historyData[historyData.length - 1];
          return (
            <Card key={key} className="glass-card border-0">
              <CardContent className="p-4">
                <p className="text-xs text-[#52525B] uppercase tracking-wider mb-1">{key}</p>
                <p className="font-data text-xl text-[#FAFAFA]">
                  ${latestData?.[key]?.toFixed(2) || '--'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
