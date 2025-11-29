import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="font-data text-xs text-[#A1A1AA] mb-2">{label}</p>
        <p className="font-data text-sm text-[#D4AF37]">Predicted: ${payload[0]?.payload?.predicted?.toFixed(2)}</p>
        <p className="font-data text-xs text-[#52525B]">Range: ${payload[0]?.payload?.lower_bound?.toFixed(2)} - ${payload[0]?.payload?.upper_bound?.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export const Forecasting = ({ commodities }) => {
  const [selectedSymbol, setSelectedSymbol] = useState("XAU");
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/commodities/${selectedSymbol}/forecast`);
        setForecastData(res.data.forecast || []);
      } catch (e) {
        console.error("Error fetching forecast:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, [selectedSymbol]);

  const selectedCommodity = commodities.find(c => c.symbol === selectedSymbol);
  const lastForecast = forecastData[forecastData.length - 1];
  const firstForecast = forecastData[0];
  const trendPercent = firstForecast && lastForecast
    ? ((lastForecast.predicted - firstForecast.predicted) / firstForecast.predicted * 100).toFixed(2)
    : 0;

  return (
    <div className="space-y-6" data-testid="forecasting">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#FAFAFA] tracking-tight">Price Forecasting</h1>
          <p className="text-[#A1A1AA] mt-1">Prophet-based statistical predictions</p>
        </div>
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger className="w-48 bg-[#121214] border-[#27272A]" data-testid="forecast-commodity-select">
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

      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-[#D4AF37]" />
              <span className="text-xs text-[#52525B] uppercase">Current Price</span>
            </div>
            <p className="font-data text-2xl text-[#FAFAFA]">${selectedCommodity?.price?.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-[#00FF94]" />
              <span className="text-xs text-[#52525B] uppercase">14-Day Forecast</span>
            </div>
            <p className="font-data text-2xl text-[#FAFAFA]">${lastForecast?.predicted?.toFixed(2) || '--'}</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className={parseFloat(trendPercent) >= 0 ? 'text-[#00FF94]' : 'text-[#FF0055]'} />
              <span className="text-xs text-[#52525B] uppercase">Expected Change</span>
            </div>
            <p className={`font-data text-2xl ${parseFloat(trendPercent) >= 0 ? 'text-[#00FF94]' : 'text-[#FF0055]'}`}>
              {parseFloat(trendPercent) >= 0 ? '+' : ''}{trendPercent}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-xl text-[#FAFAFA]">
              {selectedCommodity?.name} - 14 Day Forecast
            </CardTitle>
            <Badge variant="outline" className="border-[#3B82F6]/50 text-[#3B82F6]">
              <Info size={12} className="mr-1" /> Prophet Model
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[350px] bg-[#18181B]" />
          ) : (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <defs>
                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
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
                    dataKey="upper_bound"
                    stroke="transparent"
                    fill="url(#confidenceGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower_bound"
                    stroke="transparent"
                    fill="#09090B"
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    fill="url(#forecastGradient)"
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-[#3B82F6] mt-0.5" />
            <div>
              <p className="font-heading font-semibold text-[#FAFAFA] mb-1">About This Forecast</p>
              <p className="text-sm text-[#A1A1AA]">
                This forecast uses a Prophet-based statistical model that analyzes historical price patterns, 
                seasonality, and trend components. The shaded area represents the 95% confidence interval. 
                Forecasts are for informational purposes only and should not be used as sole basis for investment decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
