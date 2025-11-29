import { NavLink } from "react-router-dom";
import { LayoutDashboard, LineChart, Newspaper, TrendingUp, Ship, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/charts", icon: LineChart, label: "Price Charts" },
  { path: "/news", icon: Newspaper, label: "News Feed" },
  { path: "/forecast", icon: TrendingUp, label: "Forecasting" },
  { path: "/freight", icon: Ship, label: "Freight Sim" },
  { path: "/watchlist", icon: Star, label: "Watchlist" },
];

export const Sidebar = ({ isOpen, setIsOpen }) => {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-[#121214] border-r border-[#27272A] transition-all duration-300",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#27272A]">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#D4AF37] flex items-center justify-center">
              <span className="font-heading font-bold text-black text-sm">CI</span>
            </div>
            <span className="font-heading font-bold text-[#FAFAFA] tracking-tight">COMMODITY<span className="text-[#D4AF37]">INTEL</span></span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          data-testid="sidebar-toggle"
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]"
              )
            }
          >
            <item.icon size={20} />
            {isOpen && <span className="font-medium text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {isOpen && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="glass-card rounded-lg p-4">
            <p className="text-xs text-[#52525B] mb-1">Market Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse" />
              <span className="text-sm font-medium text-[#FAFAFA]">Markets Open</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
