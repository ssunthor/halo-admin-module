# HALO Admin Module (HAM) - Design Document

**Version:** 0.1.0
**Date:** 2026-07-29
**Category:** (U) Utility / Administrative
**Acronym:** HAM

## 1. Introduction & Purpose

The **HALO Admin Module (HAM)** is the user-facing web dashboard and aggregator backend for the HALO ecosystem. It is designed to work in tandem with the HALO Admin Utility (HAU) to provide a single pane of glass for provisioning, managing, and monitoring external customer HALO tenants.

Unlike the SERA Admin Module (SAM), which connects to numerous standalone utilities (AMU, HMU, OMU, DIU), HAM primarily connects directly to HAU (and utilizes its database) to orchestrate and display customer operations.

## 2. Core Architectural Principles

1.  **Aggregator Pattern:** HAM consists of a React (Vite) frontend (`HAM-WebUI`) and a FastAPI backend (`HAM-Backend`). The backend serves as an aggregator, exposing REST endpoints to the UI and communicating via gRPC with HAU.
2.  **HAU Dependency:** HAU acts as the "brawn" (executing GitOps, polling metrics). HAM acts as the "brains/face" (displaying data, taking user commands).
3.  **Shared State (Database):** HAM directly reads from/writes to the shared `ham_admin_prod_db` PostgreSQL database, complementing HAU's operations without requiring a full API boundary for every database read.
4.  **Local Caching:** HAM utilizes a local development Redis (DB 9) for caching responses and rate limiting. It does not run its own dockerized container for this.
5.  **UI/Theme Parity:** HAM utilizes the same core Theme and UX paradigms established by SAM. It sits behind the GIA gateway which handles SSO and routing seamlessly.

## 3. System Components

*   `/ui/`: **HAM-WebUI** (React/Vite). Retains the styling and components from SAM but drops SERA-specific telemetry plugins.
*   `/cli/`: **HAM-CLI**. Local operations and bootstrapping commands.
*   `/rest_api/` & `/grpc_api/`: **HAM-Backend**. The FastAPI/gRPC aggregator.
*   `/core/connectors/hau_connector.py`: The single primary gRPC client for reaching out to the HAU execution engine.
*   `/core/database/models.py`: SQLAlchemy models describing the HAM-specific tables in the shared `ham_admin_prod_db`.
*   `config/settings.yaml`: Points to the HAU PostgreSQL DSNs and the DB 9 Redis cache.

## 4. Roadmap & Future Enhancements 🚀

### 4.1. 24/7 Automated Diagnostics & Monitoring Engine

**Goal:** Provide continuous, real-time health monitoring and automated incident generation for all customer HALO tenants, directly mirroring the highly mature alarm system implemented in the SERA Admin Module (SAM).

**Architecture & High-Level Plan:**
The monitoring engine will operate entirely in the background, utilizing targeted telemetry fetching to prevent overloading the Kubernetes clusters or the shared HAU execution engine.

1. **Persistent Control Toggle (The Trigger):**
   * Monitoring will be an opt-in/opt-out feature managed per tenant/namespace.
   * A persistent `is_monitored` feature flag will be established in the shared `ham_admin_prod_db` (likely within `TenantFeatureFlag` or `HaloTenant`).
   * The HAM UI will expose this toggle, allowing operators to easily enable or disable monitoring via a gRPC update to HAU.

2. **Inventory-Driven Telemetry (The Map):**
   * Instead of executing heavy, global API-server calls (e.g., listing all pods across all namespaces), the monitoring engine will leverage the static HALO Inventory Map as its definitive "source of truth".
   * By already knowing the exact mappings of deployments, pods, and services for each namespace, HAM will issue highly specific, lightweight gRPC queries to HAU (e.g., "fetch the status of these 3 specific pods in namespace X").

3. **Background Scheduler Daemon (The Engine):**
   * HAM will implement a robust background scheduler (e.g., `halo_diagnostic_service.py`), functionally identical to SAM's `diagnostic_service.py`.
   * **The Polling Loop:** The daemon will routinely read the inventory list. For any tenant where the `is_monitored` flag is `True`, it will schedule a fast polling loop.
   * **Targeted Polling:** The scheduler will periodically call HAU's gRPC endpoints, passing only the mapped components, retrieving their live status (Ready states, restarts, image versions).

4. **Rule Evaluation & Incident Generation (The Alarms):**
   * The retrieved live telemetry will be processed through standard event rules (e.g., `DEGRADED_POD`, `SERVICE_OFFLINE`, `CRASH_LOOPING`).
   * If an anomaly is detected, HAM will generate a persistent `Incident` in the database, triggering UI alerts and potentially kicking off subsequent AI-driven root cause analyses.
