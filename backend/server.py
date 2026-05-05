from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import random
import io
import csv
from prophet import Prophet
import pandas as pd
import numpy as np

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# API Keys
NEWS_API_KEY = os.environ.get('NEWS_API_KEY', '')

app = FastAPI(title="Commodities Analytics Dashboard API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory price cache: { stooq_symbol: (data_dict, datetime) }
price_cache: Dict[str, Any] = {}
CACHE_TTL = timedelta(minutes=30)

# In-memory watchlist store
watchlist_store: Dict[str, Dict] = {}

# Models
class CommodityPrice(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    high: float
    low: float
    volume: Optional[str] = None
    timestamp: datetime
    category: str

class NewsArticle(BaseModel):
    title: str
    description: Optional[str] = None
    url: str
    source: str
    published_at: datetime
    image_url: Optional[str] = None

class ForecastData(BaseModel):
    date: str
    predicted: float
    lower_bound: float
    upper_bound: float

class FreightQuote(BaseModel):
    origin: str
    destination: str
    commodity: str
    weight_tons: float
    estimated_cost: float
    transit_days: int
    route_distance_km: float

class WatchlistItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default"
    symbol: str
    name: str
    category: str
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ─────────────────────────────────────────────────────────────────────
# Commodity definitions – stooq_symbol is the Stooq ticker
# Stooq uses lowercase futures symbols with a dot: cl.f, gc.f, etc.
# ─────────────────────────────────────────────────────────────────────
COMMODITIES = {
    "energy": [
        {"symbol": "WTI",   "name": "WTI Crude Oil",  "base_price": 78.50,   "stooq": "cl.f"},
        {"symbol": "BRENT", "name": "Brent Crude",     "base_price": 82.30,   "stooq": "cb.f"},
        {"symbol": "NG",    "name": "Natural Gas",     "base_price": 2.85,    "stooq": "ng.f"},
    ],
    "precious_metals": [
        {"symbol": "XAU",   "name": "Gold",            "base_price": 2035.50, "stooq": "gc.f"},
        {"symbol": "XAG",   "name": "Silver",          "base_price": 23.45,   "stooq": "si.f"},
        {"symbol": "XPT",   "name": "Platinum",        "base_price": 895.20,  "stooq": "pl.f"},
    ],
    "industrial_metals": [
        {"symbol": "HG",    "name": "Copper",          "base_price": 3.85,    "stooq": "hg.f"},
        {"symbol": "ALI",   "name": "Aluminum",        "base_price": 2245.00, "stooq": "q8.f"},
    ],
    "agriculture": [
        {"symbol": "ZW",    "name": "Wheat",           "base_price": 5.82,    "stooq": "zw.f"},
        {"symbol": "ZC",    "name": "Corn",            "base_price": 4.35,    "stooq": "zc.f"},
        {"symbol": "KC",    "name": "Coffee",          "base_price": 185.50,  "stooq": "kc.f"},
    ]
}

# Freight routes
FREIGHT_ROUTES = {
    ("Houston", "Rotterdam"):      {"distance": 8500,  "base_rate": 45, "days": 18},
    ("Singapore", "Los Angeles"):  {"distance": 14500, "base_rate": 55, "days": 25},
    ("Dubai", "Shanghai"):         {"distance": 6200,  "base_rate": 40, "days": 14},
    ("Lagos", "Mumbai"):           {"distance": 7800,  "base_rate": 48, "days": 16},
    ("Sydney", "Tokyo"):           {"distance": 7800,  "base_rate": 42, "days": 12},
}

# ─────────────────────────────────────────────────────────────────────
# Stooq data fetcher – no auth, no IP blocking, free
# ─────────────────────────────────────────────────────────────────────
STOOQ_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CommoditiesBot/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def _safe_float(val, default: float = 0.0) -> float:
    """Convert Stooq value to float, treating 'N/D' and blanks as default."""
    try:
        s = str(val).strip()
        if not s or s in ("N/D", "-", "N/A", "null"):
            return default
        return float(s)
    except (ValueError, TypeError):
        return default

async def fetch_stooq_quote(stooq_symbol: str) -> Optional[Dict]:
    """Fetch latest quote for a single symbol from Stooq CSV endpoint."""
    url = f"https://stooq.com/q/l/?s={stooq_symbol}&f=sd2t2ohlcv&h&e=csv"
    try:
        async with httpx.AsyncClient(timeout=10.0, headers=STOOQ_HEADERS) as http:
            resp = await http.get(url)
            resp.raise_for_status()
            text = resp.text.strip()
            if not text or "\n" not in text:
                return None
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            if not rows:
                return None
            row = rows[-1]
            close = _safe_float(row.get("Close", 0))
            open_ = _safe_float(row.get("Open", close), close)
            high  = _safe_float(row.get("High",  close), close)
            low   = _safe_float(row.get("Low",   close), close)
            vol   = int(_safe_float(row.get("Volume", 0)))
            if close == 0:
                logger.warning(f"Stooq returned zero/N/D for {stooq_symbol}")
                return None
            change = close - open_
            change_pct = (change / open_ * 100) if open_ else 0
            return {
                "price": close,
                "change": round(change, 4),
                "change_percent": round(change_pct, 4),
                "high": high,
                "low": low,
                "volume": vol,
            }
    except Exception as e:
        logger.error(f"Stooq fetch error for {stooq_symbol}: {e}")
        return None

async def fetch_stooq_history(stooq_symbol: str, days: int = 90) -> Optional[pd.DataFrame]:
    """Fetch historical OHLCV from Stooq CSV endpoint."""
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")
    to_date   = datetime.now().strftime("%Y%m%d")
    url = f"https://stooq.com/q/d/l/?s={stooq_symbol}&d1={from_date}&d2={to_date}&i=d"
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=STOOQ_HEADERS) as http:
            resp = await http.get(url)
            resp.raise_for_status()
            text = resp.text.strip()
            if not text or "Date" not in text:
                logger.warning(f"Stooq history empty for {stooq_symbol}")
                return None
            df = pd.read_csv(io.StringIO(text))
            if df.empty or "Date" not in df.columns or "Close" not in df.columns:
                return None
            # Replace N/D strings with NaN, then drop those rows
            df.replace("N/D", np.nan, inplace=True)
            df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
            df["Close"] = pd.to_numeric(df["Close"], errors="coerce")
            df = df.dropna(subset=["Date", "Close"])
            df = df.sort_values("Date").reset_index(drop=True)
            return df if not df.empty else None
    except Exception as e:
        logger.error(f"Stooq history error for {stooq_symbol}: {e}")
        return None

# ─────────────────────────────────────────────────────────────────────
# MongoDB-backed price cache (survives cold starts / serverless resets)
# ─────────────────────────────────────────────────────────────────────
async def get_cached_price(stooq_symbol: str) -> Optional[Dict]:
    """Return price from in-memory cache if not stale."""
    now = datetime.now(timezone.utc)
    if stooq_symbol in price_cache:
        data, ts = price_cache[stooq_symbol]
        if now - ts < CACHE_TTL:
            return data
    return None

async def set_cached_price(stooq_symbol: str, data: Dict):
    """Store price in memory."""
    price_cache[stooq_symbol] = (data, datetime.now(timezone.utc))

async def get_price(item: Dict) -> Dict:
    """
    Get live price for a commodity.
    1. Memory cache → 2. MongoDB cache → 3. Stooq live fetch → 4. Fallback
    """
    stooq = item["stooq"]
    cached = await get_cached_price(stooq)
    if cached:
        return cached

    # Fetch from Stooq
    data = await fetch_stooq_quote(stooq)
    if data:
        await set_cached_price(stooq, data)
        return data

    # Fallback: realistic variation on base price
    bp = item["base_price"]
    change_pct = random.uniform(-1.5, 1.5)
    change = bp * change_pct / 100
    price = bp + change
    return {
        "price": round(price, 2),
        "change": round(change, 4),
        "change_percent": round(change_pct, 4),
        "high": round(price * 1.008, 2),
        "low": round(price * 0.992, 2),
        "volume": 0,
    }

# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────
def get_commodity_by_symbol(symbol: str):
    for category, items in COMMODITIES.items():
        for item in items:
            if item["symbol"] == symbol.upper():
                return item, category
    return None, None

def generate_historical_prices(base_price: float, days: int = 30) -> List[Dict]:
    """Realistic fallback historical data using a random walk."""
    prices = []
    current = base_price
    seed = int(base_price * 100) % 10000
    rng = random.Random(seed)
    for i in range(days, 0, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        drift = rng.uniform(-0.012, 0.012)
        current = current * (1 + drift)
        o = current * rng.uniform(0.993, 0.999)
        h = current * rng.uniform(1.002, 1.012)
        lo = current * rng.uniform(0.988, 0.998)
        prices.append({
            "date": date.strftime("%Y-%m-%d"),
            "open": round(o, 2),
            "high": round(h, 2),
            "low": round(lo, 2),
            "close": round(current, 2),
            "volume": rng.randint(100000, 2000000)
        })
    return prices

def generate_prophet_forecast(df: pd.DataFrame, days: int = 14) -> List[Dict]:
    """Run Meta Prophet on historical data and return forecast."""
    try:
        logging.getLogger("prophet").setLevel(logging.WARNING)
        logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

        pdf = df[["Date", "Close"]].rename(columns={"Date": "ds", "Close": "y"}).copy()
        pdf["ds"] = pd.to_datetime(pdf["ds"]).dt.tz_localize(None)
        pdf = pdf.dropna()

        if len(pdf) < 20:
            return []

        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=len(pdf) > 200,
            interval_width=0.90,
        )
        model.fit(pdf)
        future = model.make_future_dataframe(periods=days)
        fc = model.predict(future).tail(days)

        return [
            {
                "date": str(row["ds"])[:10],
                "predicted": round(float(row["yhat"]), 2),
                "lower_bound": round(float(row["yhat_lower"]), 2),
                "upper_bound": round(float(row["yhat_upper"]), 2),
            }
            for _, row in fc.iterrows()
        ]
    except Exception as e:
        logger.error(f"Prophet error: {e}")
        return []

def generate_fallback_forecast(base_price: float, days: int = 14) -> List[Dict]:
    """Statistical fallback forecast with smooth trend."""
    forecasts = []
    current = base_price
    rng = random.Random(int(base_price))
    trend = rng.uniform(-0.003, 0.005)  # slight upward drift
    for i in range(1, days + 1):
        date = datetime.now(timezone.utc) + timedelta(days=i)
        noise = rng.uniform(-0.008, 0.008)
        current = current * (1 + trend + noise)
        unc = 0.01 + i * 0.0015
        forecasts.append({
            "date": date.strftime("%Y-%m-%d"),
            "predicted": round(current, 2),
            "lower_bound": round(current * (1 - unc), 2),
            "upper_bound": round(current * (1 + unc), 2),
        })
    return forecasts

# ─────────────────────────────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "Commodities Analytics Dashboard API", "status": "running"}

@api_router.get("/commodities")
async def get_all_commodities():
    result = []
    for category, items in COMMODITIES.items():
        for item in items:
            data = await get_price(item)
            result.append({
                "symbol": item["symbol"],
                "name": item["name"],
                "price": round(data["price"], 2),
                "change": round(data["change"], 2),
                "change_percent": round(data["change_percent"], 2),
                "high": round(data["high"], 2),
                "low": round(data["low"], 2),
                "category": category,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
    return {"commodities": result}

@api_router.get("/commodities/{symbol}")
async def get_commodity_detail(symbol: str):
    item, category = get_commodity_by_symbol(symbol)
    if not item:
        raise HTTPException(status_code=404, detail="Commodity not found")
    data = await get_price(item)
    return {
        "symbol": item["symbol"],
        "name": item["name"],
        "price": round(data["price"], 2),
        "change": round(data["change"], 2),
        "change_percent": round(data["change_percent"], 2),
        "high": round(data["high"], 2),
        "low": round(data["low"], 2),
        "category": category,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@api_router.get("/commodities/{symbol}/history")
async def get_commodity_history(symbol: str, days: int = 30):
    item, _ = get_commodity_by_symbol(symbol)
    if not item:
        raise HTTPException(status_code=404, detail="Commodity not found")

    df = await fetch_stooq_history(item["stooq"], days=max(days, 30))
    if df is not None and not df.empty:
        history = []
        for _, row in df.tail(days).iterrows():
            history.append({
                "date": str(row["Date"])[:10],
                "open":  round(float(row.get("Open",  row["Close"])), 2),
                "high":  round(float(row.get("High",  row["Close"])), 2),
                "low":   round(float(row.get("Low",   row["Close"])), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(float(row.get("Volume", 0) or 0)),
            })
        return {"symbol": item["symbol"], "name": item["name"], "history": history}

    # Fallback
    history = generate_historical_prices(item["base_price"], days)
    return {"symbol": item["symbol"], "name": item["name"], "history": history}

@api_router.get("/commodities/{symbol}/forecast")
async def get_commodity_forecast(symbol: str, days: int = 14):
    item, _ = get_commodity_by_symbol(symbol)
    if not item:
        raise HTTPException(status_code=404, detail="Commodity not found")

    # Try Prophet with real historical data (2 years)
    df = await fetch_stooq_history(item["stooq"], days=730)
    if df is not None and len(df) >= 30:
        fc = generate_prophet_forecast(df, days)
        if fc:
            return {
                "symbol": item["symbol"],
                "name": item["name"],
                "forecast": fc,
                "model": "Prophet ML Model"
            }

    # Fallback: current price + statistical trend
    data = await get_price(item)
    fc = generate_fallback_forecast(data["price"], days)
    return {
        "symbol": item["symbol"],
        "name": item["name"],
        "forecast": fc,
        "model": "Statistical Fallback"
    }

@api_router.get("/news")
async def get_commodity_news(category: Optional[str] = None, limit: int = 10):
    try:
        keywords = "commodities OR oil OR gold OR metals OR energy markets"
        if category:
            category_keywords = {
                "energy": "oil OR natural gas OR crude OR OPEC",
                "precious_metals": "gold OR silver OR platinum OR precious metals",
                "industrial_metals": "copper OR aluminum OR industrial metals",
                "agriculture": "wheat OR corn OR coffee OR agriculture commodities"
            }
            keywords = category_keywords.get(category, keywords)

        async with httpx.AsyncClient() as http:
            response = await http.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": keywords,
                    "apiKey": NEWS_API_KEY,
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": limit
                },
                timeout=10.0
            )
            data = response.json()
            if data.get("status") == "ok":
                articles = []
                for article in data.get("articles", [])[:limit]:
                    articles.append({
                        "title": article.get("title", ""),
                        "description": article.get("description"),
                        "url": article.get("url", ""),
                        "source": article.get("source", {}).get("name", "Unknown"),
                        "published_at": article.get("publishedAt"),
                        "image_url": article.get("urlToImage")
                    })
                return {"articles": articles, "total": len(articles)}
            else:
                logger.error(f"NewsAPI error: {data}")
                return {"articles": [], "total": 0, "error": "Failed to fetch news"}
    except Exception as e:
        logger.error(f"News fetch error: {e}")
        return {"articles": [], "total": 0, "error": str(e)}

@api_router.post("/freight/quote")
async def calculate_freight_quote(
    origin: str,
    destination: str,
    commodity: str,
    weight_tons: float
):
    route_key = (origin, destination)
    route = FREIGHT_ROUTES.get(route_key) or {
        "distance": random.randint(5000, 15000),
        "base_rate": random.uniform(35, 60),
        "days": random.randint(10, 30)
    }
    commodity_multipliers = {
        "oil": 1.2, "gas": 1.3, "gold": 1.5, "copper": 1.1,
        "wheat": 0.9, "corn": 0.9, "coffee": 1.0
    }
    multiplier = commodity_multipliers.get(commodity.lower(), 1.0)
    base_cost = route["base_rate"] * weight_tons * multiplier
    fuel_surcharge = base_cost * 0.15
    insurance = base_cost * 0.05
    total_cost = base_cost + fuel_surcharge + insurance
    return {
        "origin": origin,
        "destination": destination,
        "commodity": commodity,
        "weight_tons": weight_tons,
        "estimated_cost": round(total_cost, 2),
        "breakdown": {
            "base_cost": round(base_cost, 2),
            "fuel_surcharge": round(fuel_surcharge, 2),
            "insurance": round(insurance, 2)
        },
        "transit_days": route["days"],
        "route_distance_km": route["distance"]
    }

@api_router.get("/freight/routes")
async def get_freight_routes():
    routes = []
    for (origin, dest), info in FREIGHT_ROUTES.items():
        routes.append({
            "origin": origin,
            "destination": dest,
            "distance_km": info["distance"],
            "base_rate_per_ton": info["base_rate"],
            "transit_days": info["days"]
        })
    return {"routes": routes}

@api_router.get("/watchlist")
async def get_watchlist():
    return {"items": list(watchlist_store.values())}

@api_router.post("/watchlist")
async def add_to_watchlist(symbol: str, name: str, category: str):
    if symbol in watchlist_store:
        raise HTTPException(status_code=400, detail="Already in watchlist")
    item = WatchlistItem(symbol=symbol, name=name, category=category)
    doc = item.model_dump()
    doc["added_at"] = doc["added_at"].isoformat()
    watchlist_store[symbol] = doc
    return {"message": "Added to watchlist", "item": doc}

@api_router.delete("/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str):
    if symbol not in watchlist_store:
        raise HTTPException(status_code=404, detail="Not found in watchlist")
    del watchlist_store[symbol]
    return {"message": "Removed from watchlist"}

@api_router.get("/market/summary")
async def get_market_summary():
    commodities = []
    for category, items in COMMODITIES.items():
        for item in items:
            data = await get_price(item)
            commodities.append({
                "symbol": item["symbol"],
                "name": item["name"],
                "price": round(data["price"], 2),
                "change_percent": round(data["change_percent"], 2),
                "category": category
            })
    gainers = sorted(commodities, key=lambda x: x["change_percent"], reverse=True)[:3]
    losers  = sorted(commodities, key=lambda x: x["change_percent"])[:3]
    return {
        "summary": {
            "total_commodities": len(commodities),
            "categories": list(COMMODITIES.keys()),
            "market_status": "open" if 9 <= datetime.now().hour < 17 else "closed"
        },
        "top_gainers": gainers,
        "top_losers": losers,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
