import { useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ship, MapPin, Package, DollarSign, Clock, Route } from "lucide-react";
import { toast } from "sonner";

const PORTS = [
  "Houston", "Rotterdam", "Singapore", "Los Angeles", "Dubai", 
  "Shanghai", "Lagos", "Mumbai", "Sydney", "Tokyo"
];

const COMMODITIES = [
  "Oil", "Gas", "Gold", "Silver", "Copper", "Aluminum", "Wheat", "Corn", "Coffee"
];

export const FreightSimulator = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [commodity, setCommodity] = useState("");
  const [weight, setWeight] = useState("");
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateQuote = async () => {
    if (!origin || !destination || !commodity || !weight) {
      toast.error("Please fill in all fields");
      return;
    }

    if (origin === destination) {
      toast.error("Origin and destination must be different");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/freight/quote`, null, {
        params: { origin, destination, commodity, weight_tons: parseFloat(weight) }
      });
      setQuote(res.data);
      toast.success("Quote calculated successfully");
    } catch (e) {
      toast.error("Failed to calculate quote");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="freight-simulator">
      <div>
        <h1 className="font-heading text-3xl font-bold text-[#FAFAFA] tracking-tight">Freight Simulator</h1>
        <p className="text-[#A1A1AA] mt-1">Calculate shipping costs for commodity transport</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-[#FAFAFA] flex items-center gap-2">
              <Ship size={20} className="text-[#D4AF37]" />
              Route Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-[#52525B] uppercase tracking-wider mb-2 block">Origin Port</label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger className="bg-[#09090B] border-[#27272A]" data-testid="origin-select">
                  <SelectValue placeholder="Select origin port" />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-[#27272A]">
                  {PORTS.map((port) => (
                    <SelectItem key={port} value={port} className="text-[#FAFAFA] focus:bg-[#27272A]">
                      {port}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-[#52525B] uppercase tracking-wider mb-2 block">Destination Port</label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger className="bg-[#09090B] border-[#27272A]" data-testid="destination-select">
                  <SelectValue placeholder="Select destination port" />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-[#27272A]">
                  {PORTS.map((port) => (
                    <SelectItem key={port} value={port} className="text-[#FAFAFA] focus:bg-[#27272A]">
                      {port}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-[#52525B] uppercase tracking-wider mb-2 block">Commodity Type</label>
              <Select value={commodity} onValueChange={setCommodity}>
                <SelectTrigger className="bg-[#09090B] border-[#27272A]" data-testid="commodity-type-select">
                  <SelectValue placeholder="Select commodity" />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-[#27272A]">
                  {COMMODITIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-[#FAFAFA] focus:bg-[#27272A]">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-[#52525B] uppercase tracking-wider mb-2 block">Weight (Metric Tons)</label>
              <Input
                type="number"
                placeholder="Enter weight in tons"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-[#09090B] border-[#27272A]"
                data-testid="weight-input"
              />
            </div>

            <Button
              onClick={calculateQuote}
              disabled={loading}
              className="w-full bg-[#D4AF37] text-black font-bold hover:bg-[#AA8A2E] rounded-none uppercase tracking-widest text-xs py-6"
              data-testid="calculate-quote-btn"
            >
              {loading ? "Calculating..." : "Calculate Quote"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-[#FAFAFA] flex items-center gap-2">
              <DollarSign size={20} className="text-[#00FF94]" />
              Quote Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quote ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                  <span className="text-[#A1A1AA]">Total Estimated Cost</span>
                  <span className="font-data text-3xl text-[#D4AF37]">${quote.estimated_cost.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#18181B]">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-[#FF4500]" />
                      <span className="text-xs text-[#52525B]">Route</span>
                    </div>
                    <p className="font-data text-sm text-[#FAFAFA]">{quote.origin} → {quote.destination}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#18181B]">
                    <div className="flex items-center gap-2 mb-1">
                      <Route size={14} className="text-[#3B82F6]" />
                      <span className="text-xs text-[#52525B]">Distance</span>
                    </div>
                    <p className="font-data text-sm text-[#FAFAFA]">{quote.route_distance_km.toLocaleString()} km</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#18181B]">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={14} className="text-[#00FF94]" />
                      <span className="text-xs text-[#52525B]">Transit Time</span>
                    </div>
                    <p className="font-data text-sm text-[#FAFAFA]">{quote.transit_days} days</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#18181B]">
                    <div className="flex items-center gap-2 mb-1">
                      <Package size={14} className="text-[#D4AF37]" />
                      <span className="text-xs text-[#52525B]">Cargo</span>
                    </div>
                    <p className="font-data text-sm text-[#FAFAFA]">{quote.weight_tons}t {quote.commodity}</p>
                  </div>
                </div>

                <div className="border-t border-[#27272A] pt-4">
                  <p className="text-xs text-[#52525B] uppercase tracking-wider mb-3">Cost Breakdown</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Base Cost</span>
                      <span className="font-data text-[#FAFAFA]">${quote.breakdown.base_cost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Fuel Surcharge</span>
                      <span className="font-data text-[#FAFAFA]">${quote.breakdown.fuel_surcharge.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Insurance</span>
                      <span className="font-data text-[#FAFAFA]">${quote.breakdown.insurance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-[#52525B]">
                <div className="text-center">
                  <Ship size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Configure your route to get a quote</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
