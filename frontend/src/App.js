import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { Dashboard } from "@/components/Dashboard";
import { PriceCharts } from "@/components/PriceCharts";
import { NewsFeed } from "@/components/NewsFeed";
import { Forecasting } from "@/components/Forecasting";
import { FreightSimulator } from "@/components/FreightSimulator";
import { Watchlist } from "@/components/Watchlist";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  const [commodities, setCommodities] = useState([]);
  const [marketSummary, setMarketSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [commRes, summaryRes] = await Promise.all([
        axios.get(`${API}/commodities`),
        axios.get(`${API}/market/summary`)
      ]);
      setCommodities(commRes.data.commodities || []);
      setMarketSummary(summaryRes.data);
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#09090B]">
      <BrowserRouter>
        <Toaster position="top-right" theme="dark" />
        <div className="flex h-screen overflow-hidden">
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
          <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
            <Header commodities={commodities} />
            <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              <Routes>
                <Route path="/" element={<Dashboard commodities={commodities} marketSummary={marketSummary} loading={loading} />} />
                <Route path="/charts" element={<PriceCharts commodities={commodities} />} />
                <Route path="/news" element={<NewsFeed />} />
                <Route path="/forecast" element={<Forecasting commodities={commodities} />} />
                <Route path="/freight" element={<FreightSimulator />} />
                <Route path="/watchlist" element={<Watchlist commodities={commodities} />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
