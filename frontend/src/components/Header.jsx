import { useState, useEffect } from "react";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Header = ({ commodities }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-[#121214] border-b border-[#27272A] flex items-center justify-between px-6">
      <div className="flex-1 overflow-hidden mr-8">
        <div className="animate-ticker flex whitespace-nowrap">
          {[...commodities, ...commodities].map((c, i) => (
            <div key={i} className="inline-flex items-center mx-4">
              <span className="font-data text-xs text-[#A1A1AA] mr-2">{c.symbol}</span>
              <span className="font-data text-sm text-[#FAFAFA] mr-2">${c.price?.toFixed(2)}</span>
              <span className={`font-data text-xs ${c.change_percent >= 0 ? 'text-[#00FF94]' : 'text-[#FF0055]'}`}>
                {c.change_percent >= 0 ? '+' : ''}{c.change_percent?.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">

        <div className="text-right">
          <p className="font-data text-sm text-[#FAFAFA]">
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="font-data text-xs text-[#52525B]">UTC {time.getTimezoneOffset() / -60 >= 0 ? '+' : ''}{time.getTimezoneOffset() / -60}</p>
        </div>
      </div>
    </header>
  );
};
