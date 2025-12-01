# Commodities Intelligence
<img width="642" height="361" alt="Image" src="https://github.com/user-attachments/assets/400b63a4-9ee0-498c-98e7-c6b4495216f9" />

A platform for monitoring and analyzing global commodity markets - **Energy, Precious Metals, Industrial Metals, and Agriculture** - with prices, forecasting, news, and freight/logistics insights.

<img width="1671" height="864" alt="Image" src="https://github.com/user-attachments/assets/cba64bec-f0cb-45eb-9a85-342ef68e215c" />

### What it includes
- **Live market prices** with daily movements
- **Performance history & charts**
- **Short-term price forecasts**
- **Commodity news stream**
- **Global freight cost estimation** for shipping routes
- **Personal watch section** to follow selected commodities

### How it works
- **Backend**: provides market data, forecasts, news, freight estimates
- **Frontend**: interactive dashboard for all analytics modules

### Run locally

1️⃣ Install backend dependencies  
```bash
cd backend
pip install -r requirements.txt
```
2️⃣ Start backend server
```bash
uvicorn server:app --reload
```
3️⃣ Open a new terminal, keep backend running → install & start frontend
```bash
cd frontend
npm install
npm start
```
