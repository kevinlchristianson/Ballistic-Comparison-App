# Ballistic Comparison

A static web app for comparing rifle bullets and estimating which cartridges can reach a target velocity. Everything runs in the browser. Every number names its source or the model that made it.

**Estimates are not load data.** The Load data tab lists loads copied from the powder makers' published data, with a link to each source. Copies can be out of date or mistyped: confirm every charge against the source's current data, start at the published start load, and work up with care.

## What it does

- **Compare.** Up to six bullet and velocity setups, solved under the same conditions: drop, wind drift, velocity and energy, as a chart and a table.
- **Find a cartridge.** For a bullet, barrel length and target velocity, lists the cartridges that can get there (comfortable, likely, stretch, short), with the estimate's range, the model behind it, and the data supporting it. It also checks seating depth and magazine fit, and says when a custom chamber would be needed.
- **Bullets.** Browse and filter the bullet library, each with a link to the maker's page. Add your own bullets.
- **Cartridges.** The cartridge library, plus your own wildcats.
- **Bullet drawings.** Bullets with a published length plus nose length or bearing surface (Berger, Hammer) drawn to scale (`src/lib/bulletProfile.ts`, `src/app/views/bulletDrawings.ts`). Filter by maker, diameter, ogive type, base and whether every length is published; tap bullets to compare side by side or overlaid, bases aligned, with a dimension table. Boattail angle, meplat and the exact ogive curve are typical shapes, drawn dashed where they stand in for data.
- **Case drawings.** Every cartridge drawn to scale from its case dimensions (`src/lib/caseProfile.ts`, `src/app/views/catalog.ts`). Sort and filter by bullet diameter, standard, rim type and whether the drawing comes from a print; tap cases to compare them side by side or overlaid, heads aligned, on one inch scale, with a dimension table. Dimensions the library lacks are estimated from the parent case, or the closest drawn case, drawn dashed and marked ≈ with a note on how each was made.
- **Load data.** Every published load in the library for a cartridge (bullet, powder, charge, velocity, barrel, pressure, COAL, source link), and your own loads with the same fields. Your loads stay in your browser, with JSON export and import, and your max loads feed that cartridge's velocity estimates. Browse by cartridge, or by bullet across every cartridge (search by name and weight, e.g. "Berger 245"), and sort by any column. Community reports (forum compilations, user submissions) carry a "community report" tag.
- **Send to library.** Your own loads, bullets and wildcats can be sent to the public library. The button opens a prefilled GitHub issue. The **Library submission** workflow commits the owner's submissions to `data/user/submissions/` and redeploys; anyone else's wait for a maintainer to add the `approved` label.

## Using it offline

Open the site once with a connection. It saves itself and its bullet, cartridge and
velocity data on the device, so later it opens with no signal. On a phone, use
"Add to Home Screen" (Safari share menu, or Chrome's menu) to get an app icon.
While online it still fetches fresh data first, so bot updates show up as usual; a
bar at the top says when you are looking at saved data. Published load rows are
large (about 48 MB in all), so only the cartridges you have opened in Load data are
saved. The service worker is `src/app/public/sw.js`.

## How the numbers are made

| What | Model | Notes |
| --- | --- | --- |
| Trajectory | Point-mass (3-DOF), G1/G7 drag tables, RK4 (`src/lib/ballistics/`) | Checked against py-ballisticcalc 3.1.1 to within 0.25% out to 1,500 yd. |
| Velocity, published loads cover the weight | `loglog-v1` (`src/lib/velocity/loadData.ts`) | Fastest maximum load per bullet weight, moved to your barrel length, then ln(v) fitted against ln(weight). Answers within 10% of the published weights when the loads come from at least two sources and number 3 or more; a single source (often the cartridge's maker) sits about 6% from other sources on average, so its loads are blended with the other estimates instead. Never uses loads above SAAMI maximum. The physics model and similar cartridges are shown beside it as cross-checks. |
| Velocity, everything else | `blend-v1` (`src/lib/velocity/blend.ts`) | Every cartridge gets an estimate. Blends (1) the cartridge's published loads extended along the physics model's weight curve, (2) similar cartridges with published loads at that weight, scaled by how the two compare, and (3) the physics model. Each is weighted by 1/sd²; the range is twice the larger of the combined sd and the disagreement between them. Bore floor (`src/lib/velocity/boreFloor.ts`): a case holding at least 15% more powder than another of the same bullet diameter is never estimated below that smaller case when the smaller case's own published loads answer (pressure limits must not be lower, when both are published). It applies to every estimate, including ones the bigger case's own loads answer, and runs last, after the move to modern handload pressure, so the two never stack. `npm run check-blend` hides published loads and checks the result: about 6–9% RMS error, about 90–95% of hidden values inside the range. |
| Physics | `physics-v1` (`src/lib/velocity/physics.ts`) | Gas expansion from case into bore. Three constants fitted to published maximum loads for 64 cartridges with cited capacity and pressure (`npm run calibrate`, points in `data/calibration/physics-calibration.json`); barrel slope also fitted to 91 maker loads printed for two barrel lengths; about 4% error on a cartridge left out of the fit. No powder burn rate. Assumes a maximum-pressure load. In the blend it also answers outside its calibrated weight range, with a wider range. |
| Pressure basis | `src/lib/velocity/pressure.ts` | Each cartridge has a factory max (SAAMI MAP or C.I.P. Pmax, from the library) and a modern handload max: the factory max or 65,000 psi, whichever is higher, for modern brass in a strong, modern action. Estimates are worked out at factory pressure (all published loads and the physics calibration sit there), then moved to the handload max by velocity ∝ pressure^(p/2) ≈ pressure^0.30, from the physics model's fitted pressure exponent. A cartridge with only an estimated factory pressure that is answered from its own published loads is left as published. The cartridge finder can switch back to factory pressure; user loads are used as shot. |
| Missing case capacity and pressure | `src/lib/velocity/inputs.ts` | Capacity: case profile (frustum, shoulder cone and neck, after chamber clearance and brass) where a printed profile exists, parent case scaled by length and rim, heaviest published charge, and a case-size fit, blended by their measured errors. Pressure: parent case and the median of the same rim type. Shown with ≈ on the site, never written into the library, and their error widens the velocity range. |
| Your velocities | `loglog-v1` on your entries | Used first for that cartridge when present. |
| Matching | `src/lib/matching.ts` | Bullet diameter within 0.0015 in; status from the estimate's range. |
| Case drawings | `src/lib/caseProfile.ts` | Base, shoulder and neck Ø and the head-to-shoulder and head-to-neck lengths from the bots' PTG and 4D prints (belted PTG prints moved from the belt datum to the head). Missing values: the parent case's proportions if it has a print, otherwise the drawn case closest in length, bullet Ø and rim; the shoulder is placed from the library shoulder angle when there is one. Rim thickness, extractor groove and belt are typical proportions, not measured. Estimates are never written into the library. |
| Seating and fit | `src/lib/geometry.ts` | Rules of thumb: ideal COAL, seating-depth window (10% capacity loss, ogive in the neck), magazine by action class, freebore needed. |

## Data and sources

| Path | Owner | Contents |
| --- | --- | --- |
| `data/bullets/` | Bullet bot | Bullet catalogs from the makers' own sites, schema 1.2.0 |
| `data/loads/` | Load-data bot | Published load data, schema 1.0.0 |
| `data/*/comments/` | Bots | The bots' questions, answered in [`BOTS.md`](BOTS.md) |
| `data/cartridges/` | This project | Cartridge library and aliases. Every entry is still **unverified** against SAAMI/C.I.P. |
| `data/calibration/` | This project | Factory velocities the physics model is fitted to |
| `data/site-config.json` | This project | Which load sources the site may use, which count as community reports, and the barrel range for precomputed fits |
| `data/user/submissions/` | Library submission workflow | Entries people sent from the site, one file per GitHub issue |
| `data/normalized/` | Generated | Output of `npm run normalize`. Not committed. |

Sources and terms are listed in [`data/SOURCES.md`](data/SOURCES.md). The data bots work from [`BOTS.md`](BOTS.md). The bots' own tooling (Python, under `scripts/bullets/` and `scripts/loads/`) is documented in [`data/bullets/README.md`](data/bullets/README.md) and [`data/loads/README.md`](data/loads/README.md).

**What gets published.** `scripts/build-site-data.ts` writes the site's data: bullets with source links, the cartridge library, fitted velocity curves per cartridge and barrel length, and the load rows for the Load data tab, one file per cartridge. `loadRows` in `data/site-config.json` controls the rows: `"full"` (every field the source printed, including powder and charge; the project owner's choice on 2026-10-27), `"without_charges"`, or `"none"`. The script refuses to build if powder or charge appears anywhere else. To stop the site using a load source at all, add its name to `excludedLoadSources`.

## Development

Requires Node 22.

```bash
npm install
npm run dev                 # local site (run `npm run build` once first to generate its data)
npm test                    # unit tests
npm run typecheck
npm run build               # normalize, build site data, build the site into dist/
npm run normalize:fixtures  # normalize using synthetic load fixtures (tests only)
npm run calibrate           # refit the physics model's constants
```

## Deploying

The site deploys to GitHub Pages from GitHub Actions:

- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main`, including the bots' hourly data commits. It type-checks, tests, normalizes, builds and publishes. If any step fails (for example, a bot ships a bullet schema version the app doesn't know yet), nothing is deployed and the previous site stays up.
- [`.github/workflows/check.yml`](.github/workflows/check.yml) runs the same checks on every pull request and puts the normalization report in the run summary.

One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Adding data

- **A new bullet or load source:** the bots own these. Ask in [`BOTS.md`](BOTS.md). The source's terms must allow copying.
- **A cartridge:** edit `data/cartridges/cartridges.json` (see its README), keep `verification.status` honest, and run `npm test`.
- **A new bot schema version:** add it to the normalizer's supported versions in `src/lib/normalize/`, with a test, before the bot ships it.

## Known limitations

- Cartridge dimensions, capacities and pressure limits were entered from reference knowledge and are all unverified until checked against SAAMI or C.I.P. documents.
- The physics model assumes a maximum-pressure load with a suitable powder. Real rifles vary by 2–5% or more.
- Velocity estimates default to the modern handload max pressure (at least 65,000 psi), which is beyond SAAMI and C.I.P. limits and unsafe in old or weak actions. The step up uses a pressure exponent fitted across cartridges, not measured in one case.
- Published-load estimates mix powders, bullets and test barrels, so their ranges are wide on purpose.
- Barrel-length adjustment is a straight fps-per-inch rule; it is less reliable far from the test barrel.
- The solver ignores spin drift, Coriolis, aerodynamic jump and inclined shots.
- A BC printed without a drag model is shown but never used in trajectories.
- Seating checks are rules of thumb, not chamber drawings. Neck length is assumed to be one caliber when unknown.
- Many bullets have no published length, so seating depth can't be checked for them.
- Case drawings: PTG prints are chamber dimensions, a few thousandths larger than the brass. Rims, extractor grooves and belts are drawn to typical proportions. About 165 cartridges have no full print yet, so parts of their drawings are estimated (dashed).
- Bullet drawings: makers don't publish boattail angle, meplat or Rt/R, so those are typical (7°, about 0.22 calibers, Rt/R 1 / 0.75 / 0.5 for tangent / hybrid / secant). Hammer's driving bands are not drawn.
- Imperial units only.
- User data lives in one browser. Export it to keep a copy.
- Load data rows are copies from when the bots last collected them. Sources revise their data; always check the source.
