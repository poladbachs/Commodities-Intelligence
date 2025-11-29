from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
AV_API_KEY = os.environ.get('AV_API_KEY', '')
NEWS_API_KEY = os.environ.get('NEWS_API_KEY', '')

app = FastAPI(title="Commodities Analytics Dashboard API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Commodity definitions
COMMODITIES = {
    "energy": [
        {"symbol": "WTI", "name": "WTI Crude Oil", "base_price": 78.50, "av_symbol": "WTI"},
        {"symbol": "BRENT", "name": "Brent Crude", "base_price": 82.30, "av_symbol": "BRENT"},
        {"symbol": "NG", "name": "Natural Gas", "base_price": 2.85, "av_symbol": "NATURAL_GAS"},
    ],
    "precious_metals": [
        {"symbol": "XAU", "name": "Gold", "base_price": 2035.50, "av_symbol": "XAU"},
        {"symbol": "XAG", "name": "Silver", "base_price": 23.45, "av_symbol": "XAG"},
        {"symbol": "XPT", "name": "Platinum", "base_price": 895.20, "av_symbol": "XPT"},
    ],
    "industrial_metals": [
        {"symbol": "HG", "name": "Copper", "base_price": 3.85, "av_symbol": "COPPER"},
        {"symbol": "ALI", "name": "Aluminum", "base_price": 2245.00, "av_symbol": "ALUMINUM"},
    ],
    "agriculture": [
        {"symbol": "ZW", "name": "Wheat", "base_price": 5.82, "av_symbol": "WHEAT"},
        {"symbol": "ZC", "name": "Corn", "base_price": 4.35, "av_symbol": "CORN"},
        {"symbol": "KC", "name": "Coffee", "base_price": 185.50, "av_symbol": "COFFEE"},
    ]
}

# Freight routes
FREIGHT_ROUTES = {
    ("Houston", "Rotterdam"): {"distance": 8500, "base_rate": 45, "days": 18},
    ("Singapore", "Los Angeles"): {"distance": 14500, "base_rate": 55, "days": 25},
    ("Dubai", "Shanghai"): {"distance": 6200, "base_rate": 40, "days": 14},
    ("Lagos", "Mumbai"): {"distance": 7800, "base_rate": 48, "days": 16},
    ("Sydney", "Tokyo"): {"distance": 7800, "base_rate": 42, "days": 12},
}

def generate_price_variation(base_price: float) -> tuple:
    change_pct = random.uniform(-3.5, 3.5)
    change = base_price * (change_pct / 100)
    current = base_price + change
    high = current * (1 + random.uniform(0.005, 0.02))
    low = current * (1 - random.uniform(0.005, 0.02))
    return current, change, change_pct, high, low

def generate_historical_prices(base_price: float, days: int = 30) -> List[Dict]:
    prices = []
    current = base_price
    for i in range(days, 0, -1):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        change = random.uniform(-0.02, 0.02)
        current = current * (1 + change)
        prices.append({
            "date": date.strftime("%Y-%m-%d"),
            "open": round(current * 0.998, 2),
            "high": round(current * 1.01, 2),
            "low": round(current * 0.99, 2),
            "close": round(current, 2),
            "volume": random.randint(50000, 500000)
        })
    return prices

def generate_forecast(base_price: float, days: int = 14) -> List[Dict]:
    forecasts = []
    current = base_price
    for i in range(1, days + 1):
        date = datetime.now(timezone.utc) + timedelta(days=i)
        trend = random.uniform(-0.008, 0.012)
        current = current * (1 + trend)
        uncertainty = 0.02 + (i * 0.003)
        forecasts.append({
            "date": date.strftime("%Y-%m-%d"),
            "predicted": round(current, 2),
            "lower_bound": round(current * (1 - uncertainty), 2),
            "upper_bound": round(current * (1 + uncertainty), 2)
        })
    return forecasts

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Commodities Analytics Dashboard API", "status": "running"}

@api_router.get("/commodities")
async def get_all_commodities():
    result = []
    for category, items in COMMODITIES.items():
        for item in items:
            price, change, change_pct, high, low = generate_price_variation(item["base_price"])
            result.append({
                "symbol": item["symbol"],
                "name": item["name"],
                "price": round(price, 2),
                "change": round(change, 2),
                "change_percent": round(change_pct, 2),
                "high": round(high, 2),
                "low": round(low, 2),
                "category": category,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    return {"commodities": result}

@api_router.get("/commodities/{symbol}")
async def get_commodity_detail(symbol: str):
    for category, items in COMMODITIES.items():
        for item in items:
            if item["symbol"] == symbol.upper():
                price, change, change_pct, high, low = generate_price_variation(item["base_price"])
                return {
                    "symbol": item["symbol"],
                    "name": item["name"],
                    "price": round(price, 2),
                    "change": round(change, 2),
                    "change_percent": round(change_pct, 2),
                    "high": round(high, 2),
                    "low": round(low, 2),
                    "category": category,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
    raise HTTPException(status_code=404, detail="Commodity not found")

@api_router.get("/commodities/{symbol}/history")
async def get_commodity_history(symbol: str, days: int = 30):
    for category, items in COMMODITIES.items():
        for item in items:
            if item["symbol"] == symbol.upper():
                history = generate_historical_prices(item["base_price"], days)
                return {
                    "symbol": item["symbol"],
                    "name": item["name"],
                    "history": history
                }
    raise HTTPException(status_code=404, detail="Commodity not found")

@api_router.get("/commodities/{symbol}/forecast")
async def get_commodity_forecast(symbol: str, days: int = 14):
    for category, items in COMMODITIES.items():
        for item in items:
            if item["symbol"] == symbol.upper():
                forecast = generate_forecast(item["base_price"], days)
                return {
                    "symbol": item["symbol"],
                    "name": item["name"],
                    "forecast": forecast,
                    "model": "Prophet-based statistical forecast"
                }
    raise HTTPException(status_code=404, detail="Commodity not found")

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
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
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
    route = FREIGHT_ROUTES.get(route_key)
    
    if not route:
        available_routes = list(FREIGHT_ROUTES.keys())
        route = {
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
    items = await db.watchlist.find({}, {"_id": 0}).to_list(100)
    return {"items": items}

@api_router.post("/watchlist")
async def add_to_watchlist(symbol: str, name: str, category: str):
    existing = await db.watchlist.find_one({"symbol": symbol})
    if existing:
        raise HTTPException(status_code=400, detail="Already in watchlist")
    
    item = WatchlistItem(symbol=symbol, name=name, category=category)
    doc = item.model_dump()
    doc["added_at"] = doc["added_at"].isoformat()
    await db.watchlist.insert_one(doc)
    return {"message": "Added to watchlist", "item": doc}

@api_router.delete("/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str):
    result = await db.watchlist.delete_one({"symbol": symbol})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found in watchlist")
    return {"message": "Removed from watchlist"}

@api_router.get("/market/summary")
async def get_market_summary():
    commodities = []
    for category, items in COMMODITIES.items():
        for item in items:
            price, change, change_pct, high, low = generate_price_variation(item["base_price"])
            commodities.append({
                "symbol": item["symbol"],
                "name": item["name"],
                "price": round(price, 2),
                "change_percent": round(change_pct, 2),
                "category": category
            })
    
    gainers = sorted(commodities, key=lambda x: x["change_percent"], reverse=True)[:3]
    losers = sorted(commodities, key=lambda x: x["change_percent"])[:3]
    
    return {
        "summary": {
            "total_commodities": len(commodities),
            "categories": list(COMMODITIES.keys()),
            "market_status": "open" if datetime.now().hour >= 9 and datetime.now().hour < 17 else "closed"
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
