# WattWise AI — Smart Energy Consumption Optimizer
**InnoTech Hackathon — Smart Solution & Smart Society | Renewable Energy & Sustainable Engineering**

WattWise AI is an open, software-driven energy intelligence platform built for academic institutions, commercial facilities, and small businesses to monitor electricity consumption, identify waste, forecast future demands using Machine Learning, reduce bills, and plan rooftop solar PV adoption.

---

## 1. Quick Start Guide

### Prerequisites
- Node.js (v18+) and npm
- Python (v3.11+) and pip

### Startup Commands

#### Backend (Terminal 1)
```powershell
cd d:\websites\hackthon\backend
python app.py
```
*Backend runs on: `http://localhost:5000` (API: `http://localhost:5000/api`)*

#### Frontend (Terminal 2)
```powershell
cd d:\websites\hackthon\frontend
npm.cmd run dev
```
*Frontend runs on: `http://localhost:5173`*

---

## 2. Running Automated Tests

Run the full backend test suite covering CRUD, calculations, solar physical math, negative baseline savings, and Scikit-learn ML forecasting:

```powershell
cd d:\websites\hackthon\backend
python -m pytest test_wattwise.py -v
```
*(All 10 tests passing with 100% pass rate)*

To verify the production build of the frontend:
```powershell
cd d:\websites\hackthon\frontend
npm.cmd run build
```

---

## 3. Key Architecture & Features

- **Frontend**: React 18, Vite 5, Tailwind CSS v4, Recharts, Lucide React.
- **Backend**: Python 3.11, Flask 3.0, Pandas, NumPy, Scikit-learn.
- **Persistence**: Server-side `data.json` managed via `store.py` (pre-seeded with 45 days of realistic demo records).
- **Core Modules**:
  1. **Dashboard**: Live KPIs, switchable daily/weekly/monthly Recharts, category breakdown, solar hints, and 0–100 heuristic consumption stability indicator.
  2. **Energy Data**: Form CRUD validation, CSV drag-and-drop ingestion, template download, and demo dataset reset/purge controls.
  3. **AI Insights**: Detects days exceeding $\mu + 1.5\sigma$, weekday vs. weekend standby load ratios, usage surges $> 30\%$, and actionable recommendations with explicit kWh and ₹ savings.
  4. **Machine Learning Forecasting**: Chronological hold-out validation with L2 Regularized Ridge Regression (`Ridge(alpha=1.0)`) vs. 7-day mean baseline; supports 7d, 14d, and 30d forecast horizons.
  5. **Cost & Carbon Calculator**: Configurable tariff (₹/kWh) and emissions factor (default: 0.82 kg CO₂e/kWh), plus a What-If scenario savings simulator.
  6. **Solar PV Planner**: Physical sizing based on roof area ($m^2$), peak sun hours, 75% performance factor, turnkey cost benchmark, and simple payback calculation.
  7. **Reports & Exports**: Periodic tabular summaries with one-click CSV download for itemized records and summary reports.

---

## 4. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/consumption` | List all records and current settings |
| `POST` | `/api/consumption` | Create new consumption record |
| `PUT` | `/api/consumption/<id>` | Update existing consumption record |
| `DELETE` | `/api/consumption/<id>` | Delete consumption record |
| `POST` | `/api/upload-csv` | Upload and validate consumption CSV |
| `GET` | `/api/analytics` | Aggregated periods, stability score, anomalies, recommendations |
| `POST` | `/api/forecast` | Scikit-learn Ridge regression & baseline comparison |
| `POST` | `/api/solar-estimate` | Rooftop solar PV sizing, generation, and payback |
| `POST` | `/api/scenario` | What-If percentage savings scenario calculation |
| `GET/PUT` | `/api/settings` | Retrieve or update tariff and emissions factor |
| `POST` | `/api/demo` | Reset or clear demo dataset |
| `GET` | `/api/export` | Download raw records or summary CSV reports |

---

## 5. Documentation & Reports

- Comprehensive Technical Report: [`wattwise_project_report.md`](file:///d:/websites/hackthon/wattwise_project_report.md)
- Official Word Document: [`WattWise_AI_Technical_Report_Final.docx`](file:///d:/websites/hackthon/WattWise_AI_Technical_Report_Final.docx)
