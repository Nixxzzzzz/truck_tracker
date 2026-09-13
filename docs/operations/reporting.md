# Standard Operating Procedure: Performance Reporting & Auditing

## 1. Reporting Metrics Overview
The TruckTracker reporting module provides consolidated operational analytics across three primary scopes:
1. **Daily Operations**: Exact delivery checkpoint counts, arrival accuracy, and bottleneck Pareto distributions for a selected operational date.
2. **Weekly Performance (7 Days)**: Rolling 7-day throughput comparison, SLA on-time percentages, and driver roster completion rates.
3. **Monthly Audit (30 Days)**: Cumulative fleet utilization, total kilometers logged, and maintenance downtime tracking.

---

## 2. Metric Calculations
- **On-Time SLA Rate (%)**:
  $$\text{On-Time \%} = \frac{\text{Completed Stops marked ON\_TIME or EARLY}}{\text{Total Completed Stops}} \times 100$$
  - Threshold **$\ge 90\%$**: Optimal (contractual performance met)
  - Threshold **$75\% - 89\%$**: Acceptable
  - Threshold **$< 75\%$**: Attention Required (investigate delay root causes)
- **Total Delay Duration**: Sum of recorded delay minutes across completed and active manifests for the period.
- **Corridor Pareto Distribution**: Aggregation of delay minutes grouped by root cause category (`Traffic Bottleneck`, `Dock Unloading Queue`, `Border Checkpost`).

---

## 3. CSV Export Procedure
1. Navigate to **Performance Analytics** in Manager View.
2. Select target operational date or audit period.
3. Click **Export Operational CSV**.
4. The server returns a structured CSV file formatted for ERP/TMS spreadsheet ingestion.
