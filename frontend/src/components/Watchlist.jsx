import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export const Watchlist = ({ commodities }) => {
  const [watchlist, setWatchlist] = useState([]);
  const [selectedAdd, setSelectedAdd] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get(`${API}/watchlist`);
      setWatchlist(res.data.items || []);
    } catch (e) {
      console.error("Error fetching watchlist:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const addToWatchlist = async () => {
    if (!selectedAdd) {
      toast.error("Please select a commodity");
      return;
    }

    const commodity = commodities.find(c => c.symbol === selectedAdd);
    if (!commodity) return;

    try {
      await axios.post(`${API}/watchlist`, null, {
        params: {
          symbol: commodity.symbol,
          name: commodity.name,
          category: commodity.category
        }
      });
      toast.success(`${commodity.name} added to watchlist`);
      setSelectedAdd("");
      fetchWatchlist();
    } catch (e) {
      if (e.response?.status === 400) {
        toast.error("Already in watchlist");
      } else {
        toast.error("Failed to add to watchlist");
      }
    }
  };

  const removeFromWatchlist = async (symbol) => {
    try {
      await axios.delete(`${API}/watchlist/${symbol}`);
      toast.success("Removed from watchlist");
      fetchWatchlist();
    } catch (e) {
      toast.error("Failed to remove");
    }
  };

  const getWatchlistWithPrices = () => {
    return watchlist.map(item => {
      const liveData = commodities.find(c => c.symbol === item.symbol);
      return { ...item, ...liveData };
    });
  };

  const watchlistWithPrices = getWatchlistWithPrices();
  const availableToAdd = commodities.filter(
    c => !watchlist.some(w => w.symbol === c.symbol)
  );

  return (
    <div className="space-y-6" data-testid="watchlist">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#FAFAFA] tracking-tight">My Watchlist</h1>
          <p className="text-[#A1A1AA] mt-1">Track your favorite commodities</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedAdd} onValueChange={setSelectedAdd}>
            <SelectTrigger className="w-48 bg-[#121214] border-[#27272A]" data-testid="add-commodity-select">
              <SelectValue placeholder="Add commodity" />
            </SelectTrigger>
            <SelectContent className="bg-[#121214] border-[#27272A]">
              {availableToAdd.map((c) => (
                <SelectItem key={c.symbol} value={c.symbol} className="text-[#FAFAFA] focus:bg-[#27272A]">
                  {c.name} ({c.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={addToWatchlist}
            className="bg-[#D4AF37] text-black font-bold hover:bg-[#AA8A2E] rounded-none uppercase tracking-widest text-xs px-6"
            data-testid="add-to-watchlist-btn"
          >
            <Plus size={16} className="mr-2" /> Add
          </Button>
        </div>
      </div>

      {watchlistWithPrices.length === 0 ? (
        <Card className="glass-card border-0">
          <CardContent className="py-16 text-center">
            <Star size={48} className="mx-auto mb-4 text-[#52525B]" />
            <p className="text-[#A1A1AA] mb-2">Your watchlist is empty</p>
            <p className="text-sm text-[#52525B]">Add commodities to track their prices</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlistWithPrices.map((item) => {
            const isPositive = item.change_percent >= 0;
            return (
              <Card
                key={item.symbol}
                className="glass-card border-0 hover:gold-glow transition-all duration-300 group"
                data-testid={`watchlist-item-${item.symbol}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Star size={14} className="text-[#D4AF37] fill-[#D4AF37]" />
                        <span className="font-data text-xs text-[#52525B]">{item.symbol}</span>
                      </div>
                      <p className="font-heading font-semibold text-[#FAFAFA]">{item.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromWatchlist(item.symbol)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#FF0055] hover:text-[#FF0055] hover:bg-[#FF0055]/10"
                      data-testid={`remove-${item.symbol}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-data text-2xl font-bold text-[#FAFAFA]">
                        ${item.price?.toFixed(2)}
                      </p>
                      <div className={`flex items-center gap-1 ${isPositive ? 'text-[#00FF94]' : 'text-[#FF0055]'}`}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span className="font-data text-sm">
                          {isPositive ? '+' : ''}{item.change_percent?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[#52525B]">
                      <p>H: <span className="font-data text-[#A1A1AA]">${item.high?.toFixed(2)}</span></p>
                      <p>L: <span className="font-data text-[#A1A1AA]">${item.low?.toFixed(2)}</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
