# Universe and data acquisition — Chapters 03–04

Audit date: 2026-11-24. Research only. The original scope is unchanged: 22 representative ETF candidates plus USD cash, expand to historically eligible 300–3000 US stocks (initial research ranking 1,000), individual US Treasury bills/notes/bonds/TIPS, and finally contract-level futures. Corporate/foreign/municipal/agency/MBS debt and mixed bond ETFs are excluded. Options remain an explicitly gated extension. No instrument becomes investable merely because observations exist.

## Verified November delivery

The eleven WRDS exports include daily volume and ex-dividend returns, shares, daily and monthly indexes, distributions, delistings, security headers, name history, quarterly and annual fundamentals, and dated CCM links. The daily supplement contains 54,356,930 rows; 53,638,879 have a populated volume field. Joining the original ETF extract on PERMNO and session date reconciled volume and total return on all 132,278 keys across all 22 funds. Daily price and return status flags and the 2026 CRSP refresh are still missing. Quarterly data include 973,374 announcement dates through the audit date. Exclude one future fiscal date, and validate as-filed availability before use.

Monthly CRSP classification and security intervals support 336 month-end rankings of 1,000 US common stocks. Each ranking uses that month's positive capitalization, regular-way active trading and primary exchange. Apply it only at subsequent decisions. Historical index membership, publication time and executable liquidity are separate checks.

| Local addition | Observed coverage | Use boundary |
|---|---|---|
| Monthly Statement of the Public Debt | 310 month ends through October 2026; 453 in-scope issues with positive outstanding balances on October 31 | Use statement release date for PIT decisions |
| TreasuryDirect TIPS daily ratios | 108 of 108 auction-master TIPS with observations; 322,922 issue-days through November 24 | Validate completeness per issue, publication vintage, accrued interest and coupons |
| Historical nominal Treasury prices (CUSIP-Set archive) | 4,129 dates, May 2008–November 2024, with at least one populated positive price field | Source-specific field availability; no TIPS in matched output. Keep sources separate |
| Historical FedInvest mirror (ustreasuries) | 508,322 unique issue-days on 1,539 dates in 2010–2016. End-of-day values agree with 636 direct observations on two overlapping test dates | Limited cross-check, no executable-price guarantee |
| CFTC legacy futures-only | 14,275 weekly market records, ten families through November 17, 2026; start dates and gaps vary | All expiries aggregated. Separately, ESZ6 and NQZ6 trade samples on November 9 passed archive hash checks. Full settlements and dated margins remain missing |
| Coinbase spot via FRED | BTC/USD from December 2014, ETH/USD from May 2016; both through November 23, 2026 | Separate seven-day research calendar; venue, custody, costs and eligibility pending |
| Fama–French five factors and momentum | Official monthly and daily releases through September 2026 | Latest-vintage research inputs in percent |

Rebuild with `audit_wrds_delivery.py`, `reconcile_etf_volumes.py`, `build_monthly_stock_candidates.py`, `fetch_universe_supplements.py tips` or `crypto`, `fetch_futures_positioning.py`, `fetch_treasury_debt_statements.py` and `audit_treasury_supplements.py` in the scripts directory. Archive readers retain distinct source provenance. Raw, normalized and proprietary files remain local. No new commodity spot sleeve.

## Earlier local findings

The new directory is named `data/new data ` (including a trailing space); the resolver matches the trimmed name and prefers the new readable raw ETF copy. Original files remain immutable. All raw and derived data are ignored by Git.

| Source | Verified local finding | Limitation |
|---|---|---|
| Adjusted ETF CSV | 12 of 22 candidate ETFs; sample history 2005-01-03–2026-11-18 | 10 missing from this particular vendor; GLD outside the current ETF scope |
| CRSP CIZ monthly | All 22 ETF histories located by ticker and unique PERMNO; source manifest 1998–2025 | Need 2026 refresh, flags/events reconciliation, validated publication chronology |
| CRSP CIZ daily | All 22 ETF histories located by the monthly PERMNO crosswalk | Daily raw fields include price, total return, bid/ask and shares, but no volume or price/return status flags; no automatic vendor splice |
| CRSP common stocks | Preliminary 3,658 US common-stock PERMNOs with positive market cap; locally rank 1,000 at 2025-12-31; all 1,000 have daily returns that day | Not historical membership or approved security universe; classification, listing, delisting, liquidity and availability gates not yet verified |
| Compustat / CCM | Annual export and dated links present; headers inspected | Annual export lacks verified filing availability (`rdq`/accession) and complete quarterly, cash-flow and revision fields |
| Factors | Local manifests: FF5 and momentum through Aug 2026, q5 through Dec 2025, BAB through Jul 2026 | Check frequency, units, definitions and rights before use |
| FRED macro/FX | Existing local FRED/ALFRED pack plus freshly downloaded latest-vintage series | Latest vintage ≠ information available historically; additional vintage releases needed |
| Course sentiment | StockTwits aggregates and course artifacts | Optional; rights unconfirmed; do not use unknown pickle payloads or publish raw records |

The monthly and daily streaming audits are generated under `data/processed/universe/`; the selected PERMNO list and limited ETF daily extract stay local. Source size/modification time checked before and after reading, not claimed as a cryptographic source verification. Daily and monthly series remain separate, and the adjusted vendor copy is never silently concatenated to CRSP. All 22 ETF histories are present, but no 22/22 *validated investability* claim is made. Earlier-than-inception observations excluded; common 22-fund history cannot start before XLC's 2018 launch, whereas a time-varying universe may start earlier with eligible funds.

## Free public sources: acquired and remaining

| Dataset | Source | Actual availability / next step |
|---|---|---|
| US Treasury issue master | [Treasury Fiscal Data](https://fiscaldata.treasury.gov/datasets/treasury-securities-auctions-data/) | 8,219 legacy and 389 v2 auction records downloaded (1998 onward requested); overlapping records require reconciliation, not a sum of unique instruments. CUSIP, issue/maturity, auction yield and flags; not a daily secondary-market price source. |
| USD rates, nominal and real curves, CHF/USD | [FRED](https://fred.stlouisfed.org/) | DTB3, DGS1MO, DGS3MO, DGS2/5/10/30, DFII5/10/30, DEXSZUS downloaded individually. DEXSZUS is CHF per USD. Yields are not total returns. |
| Macro observations | FRED | CPIAUCSL, INDPRO, UNRATE, GDPC1 downloaded as current vintage; use existing ALFRED files and acquire missing historical vintages before signal tests. |
| Historical ETF holdings | [SEC Form N-PORT bulk files](https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets) | Free public bulk archives cover Oct 2019 onward. Download required quarters, map fund series/share class, retain accession and actual filing acceptance time; verify complete holdings and derivatives. Pre-2019 is not solved by this source. |
| Financial statements | [SEC EDGAR Company Facts](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Public filings and accession history, not a complete standardized PIT Compustat replacement. Match original accession and acceptance time; no latest-fact shortcut. |
| TIPS index ratios, Treasury curves | TreasuryDirect / Treasury / FRED | Obtain contractual index ratios and issue-specific terms as needed; continuous market value still requires secondary-market observations. |
| Factor data | [Kenneth French](https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html), Global-q and AQR | Already imported; refresh from official sources if needed after source-specific rights review. |

Public downloads are stored with SHA-256 and UTC acquisition receipts in `data/raw/public_universe/2026-11-24/`. FRED graph CSV is a public download, not authenticated ALFRED vintage acquisition. Never treat a “free API” as permission to redistribute. [FRED terms](https://fred.stlouisfed.org/docs/api/terms_of_use.html) explicitly leave third-party rights in force. SEC automated access must observe the published fair-access limits (maximum 10 requests per second; use a substantially lower project limit and identify the client). No unofficial Yahoo scraper or free API promise of 20-year daily adjusted series: [Alpha Vantage documentation](https://www.alphavantage.co/documentation/) distinguishes compact/free access and premium endpoints. Use the existing licensed CRSP source instead.

## Original WRDS request list — consult the verified delivery above before ordering

Check HEC/WRDS entitlement and terms before downloading; subscription tables differ. Do not export credentials or publish results to the public GitHub. Select dates 1998-01-01 through latest available; for the first implementation, a targeted 22-ETF export is sufficient. Record extraction date, query filters and dataset release/version. For initial stock work, keep inactive/delisted securities, never filter only today's active listings.

| Priority | Dataset to request | Needed fields / filters | Why |
|---|---|---|---|
| P0 | CRSP CIZ Stock Daily | The 22 catalog tickers resolved to PERMNO; include `DlyCalDt`, `DlyPrc`, `DlyRet`, `DlyRetx`, `DlyVol`, `DlyBid`, `DlyAsk`, `DlyPrcFlg`, `DlyRetFlg`, shares and date-valid identity/classification; include 2026 refresh | Existing daily export already covers all 22 through 2025; missing volume/flags and recent dates |
| P0 | CRSP CIZ Monthly + security history/events | Refresh `MthCalDt`, `MthRet`, `MthRetx`, `MthCap`, `MthVol`, ticker/CUSIP/PERMNO/PERMCO, exchange/share type, listing/delisting and distribution/event flags; include delisted | Historical membership and liquidity, correct identity and CIZ return conventions |
| P0 | CRSP Survivor-Bias-Free Mutual Fund database / fund holdings | If subscribed: fund/portfolio/share-class ID, ticker/CUSIP crosswalk, holding CUSIP/type, market value/weight, dates and publication evidence for BIL/SHY/IEF/TLT/TIP | Historical Treasury-only verification, especially before SEC N-PORT history; verify coverage and reporting delays |
| P1 | Compustat Quarterly / annual extension | `gvkey`, `datadate`, `rdq`, report/filing availability and restatement/version evidence; assets/liabilities, book equity, sales, earnings, operating cash flow, investment/capex, shares, industry and units; request quarterly (`fundq`) and annual (`funda`) as available | Existing annual fields insufficient for PIT fundamental strategies; do not equate fiscal date with public availability |
| P1 | CCM link history refresh | `GVKEY`, `LPERMNO`, `LPERMCO`, `LINKDT`, `LINKENDDT`, `LINKTYPE`, `LINKPRIM`; retain time validity | Link financial statements to historical security IDs |
| P1 | CRSP US Treasury | Daily/monthly individual CUSIP, bid/ask, price basis, accrued interest, yield, coupon, maturity, redemption and TIPS index information if covered; verify provider coverage | Public auction price and yield curves are not security-level daily returns |
| P2 | CRSP index/benchmark data | Total-return index series, historical member IDs and effective dates where licensed; index methodology | Benchmark history, no survivor bias; price index alone insufficient |
| P2 | Futures subscription (check WRDS entitlements) | ES/NQ/RTY, ZT/ZF/ZN/ZB, CL/GC, 6S per expiry; settle, OHLC, volume, OI, expiry, last trade, multiplier, tick, delivery, margin/roll history | Complete per-expiry histories usually require specialist data; no continuous-price substitute for P&L |

Current CIZ reference: [CRSP stock databases](https://www.crsp.org/research__trashed/crsp-us-stock-databases/) and [WRDS CRSP](https://wrds-www.wharton.upenn.edu/pages/about/data-vendors/center-for-research-in-security-prices-crsp/). The CIZ preliminary common-stock filter uses `EQTY`, `COM`, `NS`, `USIncFlg=Y`, issuer `CORP/ACOR` (see [WRDS CIZ example](https://wrds-www.wharton.upenn.edu/pages/wrds-research/macros/wrds-macro-indratios-ciz/)); REITs classified separately. Never apply a legacy delisting return add-on to a CIZ total return without checking field definitions.

## Hard-to-obtain / cannot honestly mark complete yet

- Complete historical holdings of Treasury ETFs before 2019, particularly every decision date; monthly/quarterly disclosures and publication delay matter. Gate out dates lacking adequate evidence rather than assume the prospectus proves actual holdings.
- Individual Treasury secondary-market executable prices, accrued coupon and TIPS treatment; public auction terms and FRED curves are not a substitute.
- Per-expiry futures settlements, volumes/open interest, dated specifications and margin; official exchange specs are accessible, full history is licensed ([CME settlement data FAQ](https://www.cmegroup.com/articles/faqs/access-to-cme-group-settlement-data-faq.html)).
- True daily dollar ADV, historical fund AUM/expenses and trading status, historical constituents, exact borrow/funding, slippage and execution costs. Keep assumptions explicit; no false market-data precision.
- Historical fundamentals publication and restatement vintages and the full availability calendar; current latest-value pulls are not PIT research.

## Reproducible local commands

```bash
.venv/bin/python scripts/audit_crsp_monthly.py --snapshot 2025-12-31 --target 1000
.venv/bin/python scripts/audit_crsp_daily.py
.venv/bin/python scripts/fetch_public_universe_data.py --as-of 2026-11-24
```

The acquisition and audit scripts preserve raw files; only small derived reports, extracted ETF histories and public receipt snapshots are created locally. Normalized Parquet tables and DuckDB catalog design are in `configs/data_catalog_schema.sql`; actual normalization, calendars, corporate actions, return reconciliation and availability are Chapter 05. No market model may pass G02 on coverage alone.
