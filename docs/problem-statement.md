# Problem Statement

## Background

Military organisations operate fleets of aircraft, vehicles, and other complex equipment that must be available and fully functional at all times. These assets are equipped with Health and Usage Monitoring Systems (HUMS) that continuously measure parameters such as temperature, vibration, pressure, and usage hours. Maintenance teams also keep detailed service records and component replacement histories.

Despite this wealth of data, most organisations continue to rely on fixed-interval maintenance schedules, making maintenance decisions based on elapsed time or flight hours rather than actual component condition.

## The Problem

Maintenance decisions for mission-critical equipment are driven by fixed schedules rather than real component health, leaving available sensor and service-record evidence largely unused. As a result:

- Components are replaced before they need to be (wasted cost and downtime) or after they have already degraded to a failure point (unexpected breakdowns).
- Maintenance teams have no systematic way to know which assets will likely fail before the next mission window.
- When an asset is flagged as non-ready, there is no clear explanation of which sensor reading or service gap caused that status — diagnosis is manual and time-consuming.
- Fleet readiness assessments are based on subjective judgment rather than objective, data-driven scoring.

## Who is Affected

Military maintenance teams and mission planners responsible for aircraft, ground vehicles, and specialist equipment. These teams typically manage dozens to hundreds of assets under time pressure, with limited resources, and where unexpected equipment failure can directly compromise mission success or personnel safety.

## Why It Matters

Unexpected equipment failure during a mission is not just a logistics problem — it is a safety and operational risk. Each unplanned breakdown leads to:

- Reduced mission availability and cancelled or delayed operations.
- Longer recovery times, as maintenance teams must diagnose faults reactively.
- Disproportionate maintenance burden on a small number of critical assets.
- Increased total cost of ownership through emergency repairs and expedited parts procurement.

A shift from time-based to condition-based maintenance has been shown in comparable domains to reduce unplanned downtime by 30–50% and lower maintenance costs significantly.

## Why Existing Solutions Fall Short

Current approaches fall into two categories:

1. **Manual review of HUMS data**: Maintenance engineers periodically download and inspect sensor logs, but this is labour-intensive, inconsistent, and does not produce a forward-looking failure prediction — it only confirms past anomalies.

2. **Fixed maintenance schedules**: Scheduled maintenance ensures all assets are serviced regularly but ignores real-time condition. A component in poor condition may not be caught between service intervals, and a component in good condition will be replaced unnecessarily.

Neither approach provides a single, unified readiness score, an explanation of why an asset is at risk, or a prioritised maintenance plan that accounts for both sensor evidence and upcoming mission requirements. A purpose-built AI system is needed to bridge this gap.
