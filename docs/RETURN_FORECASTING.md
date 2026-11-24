# Chapter 08 — Experimental return forecasting

## Scope

One-period simple total or price return, in USD or CHF, at daily, weekly or
monthly frequency. The latest contiguous sequence of at most 2,500 intervals
from the verified return-source adapter is used. Missing intervals are never
compressed; a regular series with fewer than 100 observations is unavailable.
The result is research only, not a validated expected-return input.

## Design

For a label at interval t, features consist of the prior return, five- and
twenty-period means, twenty-period sample volatility and downside deviation.
One-step labels do not overlap. Split the examples chronologically 60/20/20;
fit only on train, select hyperparameters on validation; report the untouched
test. Causal rolling baselines update using only returns observed before each
forecast. No annualization or extrapolation of a one-period forecast.

Historical mean, rolling mean, EWMA (decay .94), zero-return reference; OLS,
Ridge, Lasso and Elastic Net (standardization fitted on train). Regularized
coefficients minimize mean squared loss / 2 plus alpha times the L1/L2 penalty.
Prespecified lag-only, shorter rolling-window and train-label clipping ablations. Random Forest,
XGBoost and MLP use pinned scikit-learn 1.6.1 and XGBoost 3.1.2 (CPU-only
distribution on Linux); deterministic seed 42, validation-only depth/width
selection, train-only target scaling. Non-converged MLP candidates are rejected.
The selected parameters record library versions. Missing packages are explicit.

## Evaluation and uncertainty

Validation residual 5th/95th quantiles give empirical 90% bounds, with no
coverage guarantee under distribution shift. Test MSE, MAE, directional
accuracy, temporal Spearman rank correlation (not cross-sectional IC), interval
coverage, test residual quantiles, gross buy-and-hold mean, and illustrative
long-or-cash mean net of 10 bps per unit turnover. The illustrative cash leg
earns zero; it is not the validated cash benchmark or executable backtest.
Select the candidate using minimum validation MSE, never test performance.

## References and outstanding gates

The synthetic factor reference fits CAPM and multifactor betas and uses
training factor means; the no-view Black–Litterman prior is delta times
covariance times market weights. Actual factor inputs, factor availability,
market covariance, cash benchmark and views require CH10/CH15/G02/G07.
Cross-sectional IC requires a contemporaneous eligible multi-asset panel.
Additional window ablations, extended OLS diagnostics and full economic backtests
remain pending. The advanced ML dependencies are installed by INSTALL.command
and CI from requirements-forecast.txt. The isolated macOS runtime successfully
fit all three models on synthetic data and on four local real-history assets
covering equity ETFs, a Treasury ETF, a commodity ETF and an individual stock.
The UI enables ML by default. Technical availability does not imply model
approval or closure of CH08.05/G07. Do not publish licensed series, predictions
or local data.

The asset profile exposes research forecasts, uncertainty and held-out
metrics. ForecastBundle carries version, provenance, one-period horizon,
currency, distribution reference and experimental status.
