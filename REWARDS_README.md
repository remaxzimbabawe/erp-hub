# Rewards Program System

## Overview

The Rewards Program is a reusable, multi-program loyalty system that allows administrators to create, manage, and run multiple reward programs simultaneously across all shops. Points are allocated to clients based on their purchases, and clients can redeem accumulated points for prizes.

---

## Architecture

### Data Model

#### `RewardsProgram`
| Field | Type | Description |
|---|---|---|
| `_id` | string | Unique identifier |
| `_creationTime` | number | Timestamp |
| `name` | string | Program display name (e.g., "Summer Points Blast") |
| `description` | string | Program description |
| `isActive` | boolean | Whether the program is currently running |
| `status` | `'active' \| 'inactive' \| 'retired'` | Lifecycle status |
| `minProductPriceInCents` | number | Minimum product price to participate (min $1.00 = 100 cents) |
| `thresholdAmountInCents` | number | Spending threshold to earn points (e.g., $10.00 = 1000 cents) |
| `pointsPerThreshold` | number | Points awarded per threshold reached |
| `continuousAllocation` | boolean | Whether points keep accumulating per threshold (e.g., $59 = 20pts at $10/4pts) |
| `includedTemplateIds` | string[] | Product template IDs included (derived from price rule, or manually set) |

#### `RewardsTier`
| Field | Type | Description |
|---|---|---|
| `_id` | string | Unique identifier |
| `programId` | string | FK to RewardsProgram |
| `pointsRequired` | number | Points needed to redeem this tier |
| `rewardName` | string | Prize description (e.g., "Pen", "$100 Cash") |
| `rewardValue` | string | Display value of the reward |

#### `ClientRewardsBalance`
| Field | Type | Description |
|---|---|---|
| `_id` | string | Unique identifier |
| `clientId` | string | FK to Client |
| `programId` | string | FK to RewardsProgram |
| `currentPoints` | number | Available points balance |
| `totalPointsEarned` | number | Lifetime points earned |
| `totalPointsCashedOut` | number | Lifetime points redeemed |

#### `RewardsCashout`
| Field | Type | Description |
|---|---|---|
| `_id` | string | Unique identifier |
| `_creationTime` | number | Timestamp |
| `clientId` | string | FK to Client |
| `programId` | string | FK to RewardsProgram |
| `tierId` | string | FK to RewardsTier |
| `pointsRedeemed` | number | Points consumed |
| `rewardName` | string | What they received |
| `processedBy` | string | User who processed the cashout |

#### `RewardsPointLog`
| Field | Type | Description |
|---|---|---|
| `_id` | string | Unique identifier |
| `_creationTime` | number | Timestamp |
| `clientId` | string | FK to Client |
| `programId` | string | FK to RewardsProgram |
| `saleId` | string | FK to ProductSold (the triggering sale) |
| `pointsAwarded` | number | Points given |
| `qualifyingAmountInCents` | number | The purchase total that qualified |

---

## Rules & Logic

### 1. Product Eligibility
- Admin sets a **minimum price** ($1+) for a program
- All product templates with a default price **at or above** this minimum are automatically included
- Admin clicks a button to "include all products $X and above"

### 2. Point Allocation (Threshold-Based)
- A **spending threshold** determines when points are earned (e.g., spend $10 on participating products → earn 4 points)
- **Continuous allocation**: If enabled, points stack per threshold:
  - Threshold = $10, Points = 4, Continuous = ON
  - Client spends $59 → floor(59/10) = 5 thresholds → **20 points**
  - Client spends $61 → floor(61/10) = 6 thresholds → **24 points**
- If continuous allocation is OFF, the client gets the fixed points once per qualifying transaction

### 3. Multi-Program Conflict Resolution
- A product can be in **multiple** programs simultaneously
- When a sale occurs, **only the program with the highest point yield** for that transaction is applied
- This prevents double-dipping while ensuring the client gets the best deal

### 4. POS Integration
- In the product grid, products in reward programs show a **star/gift icon**
- **Hovering** over the icon shows a tooltip listing:
  - Each program the product belongs to
  - The points available per program
- Points are calculated and allocated automatically at sale completion
- Only applies when a **client** is selected (walk-in customers don't earn points)

### 5. Rewards Table (Tiers)
- Each program has a configurable rewards table:
  - 50 points → Pen
  - 100 points → $100 cash
  - 200 points → Television
  - 500 points → Car
- Tiers are set by the admin and can be edited at any time

### 6. Cashout System
- Clients can **redeem points** for the highest tier they qualify for
- Example: Client has 53 points, pen costs 50 → cash out 50 points, left with 3 points
- Full cashout history is maintained:
  - What was redeemed
  - When
  - Who processed it
  - Points consumed

### 7. Program Reporting
- **Client Points Summary**: All clients with point balances per program
- **Tier Distribution**: How many clients fall into each reward tier, with counts of rewards needed (e.g., "5 pens needed, 1 car needed")
- **Cashout History**: Full log of all redemptions
- **Program Overview**: Total points in circulation, total redeemed, active participants

---

## Access Control

| Role | Permissions |
|---|---|
| Super Admin | Full CRUD on programs, tiers, cashouts. View all reports. |
| Manager | Full CRUD on programs, tiers, cashouts. View all reports. |
| Shop Manager | View programs. Process cashouts. View reports for their shop. |
| App User / Cashier | View reward icons in POS. Cannot manage programs. |

---

## Navigation

- **Sidebar**: "Rewards" link under Management section (visible to super_admin, manager, shop_manager)
- **Page Tabs**: Programs | Rewards Table | Client Points | Cashout History | Reports

---

## Global Scope

Reward programs are **global** — they apply to **every shop equally**. There are no per-shop program configurations. If a program is active, it applies to all POS terminals across all shops.
