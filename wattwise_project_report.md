# WattWise AI — Project Evaluation & Technical Report
**Smart Energy Consumption Optimizer for InnoTech Hackathon**

---

## 1. Executive Summary

| Attribute | Details |
| :--- | :--- |
| **Project Name** | **WattWise AI — Smart Energy Consumption Optimizer** |
| **Hackathon** | InnoTech Hackathon |
| **Category** | Smart Solution & Smart Society |
| **Domain** | Renewable Energy & Sustainable Engineering |
| **Target Users** | Academic campuses, commercial facilities, small/medium enterprises (SMEs), and residential households. |
| **Core Objective** | Eliminate electricity wastage, provide explainable energy-saving insights, forecast near-future consumption via Scikit-learn Machine Learning, estimate electricity bills and carbon footprints, and plan rooftop solar PV adoption. |
| **Current Status** | **Fully Operational & Live**: React 18 / Tailwind CSS / Recharts frontend communicating asynchronously with a Python 3.11 / Flask / Scikit-learn backend. |

---

## 2. Problem Statement & Objectives

### The Challenge
Electricity consumption across educational institutions and commercial buildings suffers from significant hidden inefficiencies:
1. **Unidentified Baseline & Idle Loads**: Lighting, computing labs, and HVAC units left running on standby during weekends and off-peak hours without operational awareness.
2. **Lack of Transparent Explainability**: Many commercial energy tools function as black-box models or require expensive IoT sensor hardware installations, making them inaccessible for educational and small business adoption.
3. **Reactive vs. Proactive Budgeting**: Energy bills and peak-demand surcharges are discovered at month-end rather than managed proactively through algorithmic forecasting.
4. **Uncertainty in Solar Adoption**: Decision-makers struggle to gauge rooftop solar feasibility without simplified, transparent physical models estimating capital requirements and returns.

### WattWise AI Solution Objectives
- **Centralized Telemetry & Tracking**: Single dashboard visualizing historical and current energy metrics across daily, weekly, and monthly periods.
- **Explainable Energy-Saving Insights**: Algorithmic rules grounded in engineering standards (e.g., BEE thermal setpoint savings) detailing *why* each recommendation was generated and quantifying expected kWh and INR savings.
- **Defensible Machine Learning Forecasting**: Time-series Ridge Regression with chronological hold-out validation and automatic fallback to moving baselines.
- **Configurable Impact Modeling**: Transparent conversion of consumption into monetary costs (₹) and carbon emissions ($\text{kg CO}_2\text{e}$), supporting user-specified emissions factors.
- **Renewable Solar Feasibility**: Software-based solar PV sizing accounting for rooftop geometry, peak sun hours, and system derating.

---

## 3. System Architecture & Implementation

```mermaid
graph TD
    subgraph Client ["Frontend Client (React 18.3 + Vite 5.4)"]
        UI[Tailwind CSS UI]
        Nav[Sidebar Navigation & Mobile Drawer]
        Charts[Recharts Time-Series Charts]
        APIClient[REST API Fetch Client (api.js)]
    end

    subgraph Server ["Backend Server (Python 3.11 + Flask 3.0)"]
        Routes[Flask App API Endpoints]
        CalcEngine[Analytical & Statistical Calc Engine (calc.py)]
        MLEngine[Scikit-learn Forecasting Pipeline (forecast.py)]
        StoreEngine[JSON File Persistence (store.py / data.json)]
    end

    UI --> APIClient
    APIClient -->|JSON / Multi-part FormData| Routes
    Routes --> CalcEngine
    Routes --> MLEngine
    Routes --> StoreEngine
    CalcEngine --> StoreEngine
    Charts --> UI
```

### Technology Stack

| Layer | Component | Version | Role in Architecture |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 18.3.1 | Component-driven Single Page Application (SPA) architecture |
| **Build Tool** | Vite | 5.4.21 | Hot Module Replacement (HMR) and optimized Rollup production bundler |
| **Styling & Theme** | Tailwind CSS | 4.0.0 | Sustainability design system: Deep Green (`#166534`), Muted Teal (`#0f766e`), Slate neutrals (`#f7f8f6`) |
| **Data Visualization** | Recharts | 2.12.7 | Composed line and bar charts with responsive SVG containers |
| **Icons** | Lucide React | 0.468.0 | Semantic icons for energy metrics, navigation, and operations |
| **Backend Framework** | Flask | 3.0.3 | RESTful API server with route handlers and error middleware |
| **CORS Middleware** | Flask-CORS | 4.0.1 | Explicit origin authorization for localhost development |
| **Data Processing** | Pandas | 2.2.2 | Resampling (`D`, `W-SUN`, `MS`), interpolation, rolling windows |
| **Numerical Array Ops** | NumPy | 1.26.4 | Matrix operations, feature stacking, standard deviation calculations |
| **Machine Learning** | Scikit-learn | 1.4.2 | L2 Regularized Ridge Regression (`Ridge(alpha=1.0)`) |
| **Persistence** | File Storage | JSON (`data.json`) | Clean `load()`/`save()` storage architecture with 45-day demo seed |

---

## 4. Feature Verification & Implementation Audit

The following table documents the verification of all features against the active codebase:

| Feature / Module | Implementation Status | Code Evidence | Notes / Report Changes |
| :--- | :--- | :--- | :--- |
| **Dashboard KPIs** | **Verified Working** | [`calc.py:57-72`](file:///d:/websites/hackthon/backend/calc.py#L57-L72), [`pages.jsx:17-38`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L17-L38) | Dynamically computes total kWh, bill in ₹, emissions in kg, and average daily load. |
| **Baseline Savings** | **Verified Working** | [`calc.py:70-72`](file:///d:/websites/hackthon/backend/calc.py#L70-L72), [`pages.jsx:26-30`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L26-L30) | Correctly handles negative savings; displays "Net vs baseline" and "+X kWh excess" when usage exceeds baseline. |
| **Consumption Stability Score** | **Verified Working** | [`calc.py:112-120`](file:///d:/websites/hackthon/backend/calc.py#L112-L120), [`pages.jsx:33`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L33) | Correctly labeled as a heuristic stability index (0–100), not a building efficiency certificate. Clamped to $[0, 100]$. |
| **Period Resampling Charts** | **Verified Working** | [`calc.py:40-47`](file:///d:/websites/hackthon/backend/calc.py#L40-L47), [`pages.jsx:11-12`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L11-L12) | Supports Daily (last 30 days), Weekly (week ending Sunday), and Monthly (`MS`) aggregations. |
| **Category Breakdown** | **Verified Working** | [`calc.py:82-85`](file:///d:/websites/hackthon/backend/calc.py#L82-L85), [`pages.jsx:36-39`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L36-L39) | Shows category kWh and share percentages for Cooling, Lighting, Appliances, Office Equipment. |
| **Manual Record CRUD** | **Verified Working** | [`app.py:38-69`](file:///d:/websites/hackthon/backend/app.py#L38-L69), [`pages.jsx:41-75`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L41-L75) | Supports Create, Read, Update, and Delete with input validation and instant state refresh. |
| **CSV Ingestion Engine** | **Verified Working** | [`app.py:71-89`](file:///d:/websites/hackthon/backend/app.py#L71-L89), [`calc.py:10-32`](file:///d:/websites/hackthon/backend/calc.py#L10-L32) | Ingests CSV files, reports added and skipped rows, skips invalid entries, validates dates and kWh. |
| **CSV Template Download** | **Verified Working** | [`pages.jsx:51-52`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L51-L52) | Generates `wattwise_template.csv` directly in the browser with pre-populated valid headers. |
| **Demo Data Controls** | **Verified Working** | [`app.py:142-148`](file:///d:/websites/hackthon/backend/app.py#L142-L148), [`store.py:11-25`](file:///d:/websites/hackthon/backend/store.py#L11-L25) | One-click reset to 45 days of demo data (with weekend patterns and AC spikes) or complete purge. |
| **High-Consumption Detection** | **Verified Working** | [`calc.py:73-76`](file:///d:/websites/hackthon/backend/calc.py#L73-L76), [`pages.jsx:81`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L81) | Identifies days where daily consumption exceeds $\mu + 1.5\sigma$ (requires at least 7 days). |
| **Weekday vs Weekend Ratio** | **Verified Working** | [`calc.py:49-55`](file:///d:/websites/hackthon/backend/calc.py#L49-L55), [`pages.jsx:82`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L82) | Computes weekday vs. weekend averages when at least 4 weekdays and 4 weekend days exist. |
| **Spike Anomaly Detection** | **Verified Working** | [`calc.py:77-79`](file:///d:/websites/hackthon/backend/calc.py#L77-L79), [`pages.jsx:83`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L83) | Flags days where consumption exceeds $1.30 \times$ trailing 7-day rolling mean. |
| **Rule-Based Recommendations** | **Verified Working** | [`calc.py:86-111`](file:///d:/websites/hackthon/backend/calc.py#L86-L111), [`pages.jsx:13-15`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L13-L15) | Transparently states trigger rule, explanation, and estimated monthly kWh and ₹ savings. |
| **ML Time-Series Forecasting** | **Verified Working** | [`forecast.py:1-42`](file:///d:/websites/hackthon/backend/forecast.py#L1-L42), [`pages.jsx:91-114`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L91-L114) | Features 7d, 14d, and 30d presets; compares 7-day mean baseline vs Ridge regression; reports test MAE. |
| **Cost & Carbon Calculator** | **Verified Working** | [`calc.py:139-144`](file:///d:/websites/hackthon/backend/calc.py#L139-L144), [`pages.jsx:116-129`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L116-L129) | What-If scenario simulator calculating savings across custom percentage reduction targets. |
| **Solar PV Sizing & Payback** | **Verified Working** | [`calc.py:125-138`](file:///d:/websites/hackthon/backend/calc.py#L125-L138), [`pages.jsx:131-157`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L131-L157) | Computes daily/monthly generation, rooftop limits, avoided emissions, turnkey cost, and simple payback. |
| **Reports & CSV Data Export** | **Verified Working** | [`app.py:150-160`](file:///d:/websites/hackthon/backend/app.py#L150-L160), [`pages.jsx:159-170`](file:///d:/websites/hackthon/frontend/src/pages.jsx#L159-L170) | Downloads raw itemized records (`wattwise_records.csv`) or periodic summary reports (`wattwise_report.csv`). |

---

## 5. Mathematical Formulas & Engineering Equations

All computations across the application, API, and reports rely on the following deterministic equations implemented in `backend/calc.py`:

### 1. Electricity Cost Calculation
$$\text{Total Cost (₹)} = \sum_{i=1}^{N} \left( \text{Consumption}_i \times \text{Tariff}_i \right)$$
*Each record maintains its own tariff rate to accurately support multi-tier tariffs or historical rate changes.*

### 2. Carbon Footprint Estimation
$$\text{Total Emissions } (\text{kg CO}_2\text{e}) = \left(\sum_{i=1}^{N} \text{Consumption}_i\right) \times \text{Emission Factor}$$
- **Default Factor**: $0.82\text{ kg CO}_2\text{e/kWh}$.
- **Attribution Note**: This value is an unverified placeholder representing an average coal-heavy grid profile. Users can configure regional verified factors (such as the Central Electricity Authority of India Baseline Database v19, which reports $\sim 0.716\text{ kg CO}_2\text{e/kWh}$ weighted grid average) via the Cost & Carbon settings page.
- **Labeling**: All emissions are explicitly labeled as statistical estimates.

### 3. Baseline Energy & Cost Savings
$$\text{Baseline Benchmark (kWh/day)} = \frac{1}{\min(14, \max(\lfloor N/2 \rfloor, 1))} \sum_{i=1}^{M} \text{Daily Consumption}_i$$
$$\text{Expected Baseline (kWh)} = \text{Baseline Benchmark} \times N_{\text{days}}$$
$$\text{Saved Energy (kWh)} = \text{Expected Baseline} - \text{Total Consumption}$$
$$\text{Saved Cost (₹)} = \text{Saved Energy (kWh)} \times \text{Average Tariff}$$
- **Handling Negative Values**: When actual consumption exceeds the baseline, $\text{Saved Energy} < 0$. The interface displays this as positive excess energy above baseline rather than claiming negative energy was saved.

### 4. Anomaly Detection Algorithms
1. **High-Consumption Days Threshold**:
   $$\text{High Day Condition} = \text{Daily Consumption}_d > \mu_{\text{daily}} + 1.5 \cdot \sigma_{\text{daily}}$$
   *Evaluated only when $N_{\text{days}} \ge 7$. Returns up to the top 5 highest days.*
2. **Unusual Spikes Condition**:
   $$\text{Expected Consumption}_d = \frac{1}{7} \sum_{k=1}^{7} \text{Daily Consumption}_{d-k}$$
   $$\text{Spike Flag} = \text{Daily Consumption}_d > 1.30 \times \text{Expected Consumption}_d$$
   *Identifies sudden surge days exceeding the trailing 7-day average by more than 30%.*

### 5. Consumption Stability Score (Heuristic Indicator)
The score ($0\text{--}100$) quantifies operational load stability:
$$\text{CV} = \frac{\sigma_{\text{daily}}}{\mu_{\text{daily}}}$$
$$\text{Pen}_{\text{variability}} = 30 \times \min\left(\frac{\text{CV}}{0.40}, 1.0\right)$$
$$\text{Pen}_{\text{trend}} = 40 \times \min\left(\frac{\max(\Delta_{\text{WoW}}, 0)}{30.0}, 1.0\right)$$
$$\text{Pen}_{\text{anomalies}} = 5 \times \min(\text{Count}_{\text{spikes}}, 6)$$
$$\text{Stability Score} = \text{clamp}\left(100 - \text{Pen}_{\text{variability}} - \text{Pen}_{\text{trend}} - \text{Pen}_{\text{anomalies}},\, 0,\, 100\right)$$
*Disclaimer: This is an internal heuristic consistency indicator based on load variance, week-over-week growth, and spike occurrences. It does not certify official building energy efficiency compliance.*

### 6. Solar Photovoltaic (PV) Planning Equations
- **Rooftop Capacity Limit**:
  $$\text{Capacity}_{\text{roof}} (\text{kW}) = \frac{\text{Area }(m^2)}{6.0\,m^2/\text{kW}}$$
  *(Assumes standard mono-crystalline silicon PV modules requiring $\sim 6.0\,m^2$ per kWp).*
- **Capacity Sizing Selection**:
  $$\text{Capacity}_{\text{used}} (\text{kW}) = \begin{cases} \text{Capacity}_{\text{override}} & \text{if entered} > 0 \\ \text{Capacity}_{\text{roof}} & \text{otherwise} \end{cases}$$
- **Daily Solar Generation**:
  $$\text{Daily Generation (kWh)} = \text{Capacity}_{\text{used}} \times \text{Peak Sun Hours} \times \text{Performance Factor}$$
  *(Default Performance Factor is $0.75$, accounting for inverter losses, thermal derating, cable loss, and dust).*
- **Useful Energy & Offset Ratio**:
  $$\text{Useful Energy (kWh/day)} = \min\left(\text{Daily Generation},\, \text{Average Daily Consumption}\right)$$
  $$\text{Offset Percentage} = \frac{\text{Useful Energy}}{\text{Average Daily Consumption}} \times 100\%$$
- **Financial Payback**:
  $$\text{Annual Bill Savings (₹)} = \text{Useful Energy} \times 365 \times \text{Tariff}$$
  $$\text{Turnkey Capital Cost (₹)} = \text{Capacity}_{\text{used}} \times 50{,}000\text{ ₹/kW}$$
  $$\text{Simple Payback (Years)} = \frac{\text{Turnkey Capital Cost}}{\text{Annual Bill Savings}}$$

---

## 6. Machine Learning Forecasting Methodology

The forecasting service in `backend/forecast.py` implements a disciplined time-series workflow:

### Feature Engineering
The feature matrix $X$ combines a continuous timeline trend with calendar cyclicity:
$$X = \left[ t,\, \mathbf{1}_{\text{dow}=0},\, \mathbf{1}_{\text{dow}=1},\, \dots,\, \mathbf{1}_{\text{dow}=6} \right]$$
where $t \in [0, N-1]$ captures macro linear growth, and $\mathbf{1}_{\text{dow}}$ is a 7-dimensional one-hot vector capturing day-of-week consumption variations.

### Strict Chronological Hold-Out Validation
To eliminate data leakage, the pipeline **never shuffles** records:
- **Training Set**: Chronological first $80\%$ of days ($t = 0$ to $N - N_{\text{test}} - 1$).
- **Test Set**: Chronological last $N_{\text{test}} = \max(5, \lfloor 0.20 \times N \rfloor)$ days.

### Dual-Model Selection & MAE Comparison
1. **Baseline Model**: Evaluates the naive 7-day moving average on the test set:
   $$\text{MAE}_{\text{baseline}} = \frac{1}{N_{\text{test}}} \sum_{i \in \text{test}} \left| y_i - \bar{y}_{\text{train, last 7}} \right|$$
2. **Supervised Ridge Model**: Trains an L2-regularized linear model on the training set:
   $$\min_{w} \| X_{\text{train}} w - y_{\text{train}} \|_2^2 + \alpha \| w \|_2^2 \quad (\alpha = 1.0)$$
   $$\text{MAE}_{\text{model}} = \frac{1}{N_{\text{test}}} \sum_{i \in \text{test}} \left| y_i - \hat{y}_i \right|$$
3. **Fallback Policy**:
   - If $N < 21$ days: Uses the labeled moving average baseline (ML requires at least 21 days for defensible training).
   - If $\text{MAE}_{\text{model}} \ge \text{MAE}_{\text{baseline}}$: The pipeline automatically reverts to the baseline forecast, explicitly logging: *"Regression did not beat the baseline on held-out data, so the baseline is shown."*
   - If $\text{MAE}_{\text{model}} < \text{MAE}_{\text{baseline}}$: The Ridge model is refit on all available history and projects forward for the requested horizon (7, 14, or 30 days).

---

## 7. Verification & Quality Assurance Evidence

### Automated Test Suite Execution
Executed in `backend/` using pytest on Python 3.11:

```powershell
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.6.0
rootdir: D:\websites\hackthon\backend
collected 10 items

test_wattwise.py::test_pct_change PASSED                                 [ 10%]
test_wattwise.py::test_validation_rejects_negative_and_bad_date PASSED   [ 20%]
test_wattwise.py::test_solar_math PASSED                                 [ 30%]
test_wattwise.py::test_scenario PASSED                                   [ 40%]
test_wattwise.py::test_health_and_demo_analytics PASSED                  [ 50%]
test_wattwise.py::test_crud PASSED                                       [ 60%]
test_wattwise.py::test_csv_upload PASSED                                 [ 70%]
test_wattwise.py::test_forecast_demo_and_insufficient PASSED             [ 80%]
test_wattwise.py::test_negative_baseline_savings_and_score_bounds PASSED [ 90%]
test_wattwise.py::test_solar_payback_and_limits PASSED                   [100%]

============================= 10 passed in 11.69s =============================
```

### Production Build Verification
Executed in `frontend/` using Vite production bundler:

```powershell
> wattwise-frontend@1.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 2382 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.36 kB │ gzip:   0.26 kB
dist/assets/index-CXrVE7U6.css   16.37 kB │ gzip:   4.07 kB
dist/assets/index-BABSAEjZ.js   582.81 kB │ gzip: 165.49 kB
✓ built in 24.08s
```

### Live API Communication Check
- `GET http://127.0.0.1:5000/api/health` -> `HTTP 200 {"status": "healthy"}`
- `GET http://127.0.0.1:5000/api/analytics` -> `HTTP 200 {"success": true, "data": {...}}`
- `GET http://localhost:5173/` -> `HTTP 200 OK`

---

## 8. Limitations & Unresolved Scope

To ensure academic and technical integrity, the following boundaries are formally disclosed:

1. **Absence of Real-time Physical IoT Telemetry**: WattWise AI processes entered or uploaded time-series records. It is not currently connected to live smart meters, modbus hardware, or CT clamps.
2. **Emissions Factor Regional Specificity**: The default emission factor of $0.82\text{ kg CO}_2\text{e/kWh}$ is an estimated national aggregate. Accurate carbon auditing requires inputting the regional grid factor verified by the local distribution company or power authority.
3. **Linear Solar Geometry Model**: The solar planner provides preliminary feasibility estimates based on peak sun hours and rooftop square meters. It does not perform 3D ray-tracing, horizon shading analysis, or hourly meteorological simulation (such as SAM or PVsyst).
4. **Single-Node JSON Persistence**: Data is persisted on the local server in `data.json`. While lightweight and dependency-free for hackathon deployment, production scaling requires a relational database (e.g., PostgreSQL).

---

## 9. Hackathon Pitch & Demonstration Script

1. **Introduction (1 min)**:
   - Introduce **WattWise AI** as an open, software-first energy intelligence platform for colleges and SMEs.
2. **Live Dashboard Walkthrough (1.5 min)**:
   - Highlight the real-time calculated KPI cards (kWh, bill, emissions, baseline difference).
   - Switch between daily, weekly, and monthly bar charts.
   - Point out the 0–100 consumption stability index and the category shares.
3. **Data Operations & CSV Ingestion (1 min)**:
   - Add a record manually to demonstrate form validation.
   - Demonstrate CSV import using the provided `sample_consumption.csv`.
   - Show how demo records can be reset or purged instantly.
4. **AI Insights & Explainable Rules (1.5 min)**:
   - Walk through the high-consumption days and weekend idle load ratios.
   - Show how each recommendation cites an explicit rationale, calculated kWh, and monthly ₹ savings.
5. **Machine Learning Forecasting (1.5 min)**:
   - Select 7-day, 14-day, or 30-day horizons.
   - Explain the chronological hold-out split and demonstrate how test MAE verifies model superiority over baseline.
6. **Solar PV Sizing & Data Export (1 min)**:
   - Input sample campus roof area ($m^2$) to calculate capacity, estimated ₹ capital cost, and payback years.
   - Download the generated periodic summary CSV report.

---

## 10. References & Verified Sources

1. **Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India**: *Energy Conservation Guidelines for Air Conditioning in Commercial Buildings* (Recommending $24^\circ\text{C}$ cooling setpoints for $\sim 6\text{--}8\%$ energy reduction per degree).
2. **Central Electricity Authority (CEA), Government of India**: *$\text{CO}_2$ Baseline Database for the Indian Power Sector, Version 19* (Average grid emission factor benchmark).
3. **National Renewable Energy Laboratory (NREL)**: *PVWatts Photovoltaic Sizing and Performance Ratio Guidelines* (Standard system performance derate ratio of $0.75\text{--}0.80$).
4. **Scikit-learn Documentation**: *L2 Regularized Ridge Regression (`sklearn.linear_model.Ridge`)* for time-series feature representations.
