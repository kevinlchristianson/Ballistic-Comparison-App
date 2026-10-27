# Ballistic Comparison

A static web app for comparing rifle bullets and estimating which cartridges can reach a target velocity. Everything runs in the browser. Every number names its source or the model that made it.

**Estimates are not load data.** The Load data tab lists loads copied from the powder makers' published data, with a link to each source. Copies can be out of date or mistyped: confirm every charge against the source's current data, start at the published start load, and work up with care.

## What it does

- **Compare.** Up to six bullet and velocity setups, solved under the same conditions: drop, wind drift, velocity and energy, as a chart and a table.
- **Find a cartridge.** For a bullet, barrel length and target velocity, lists the cartridges that can get there (comfortable, likely, stretch, short), with the estimate's range, the model behind it, and the data supporting it. It also checks seating depth and magazine fit, and says when a custom chamber would be needed.
- **Bullets.** Browse and filter the bullet library, each with a link to the maker's page. Add your own bullets.
- **Cartridges.** The cartridge library, plus your own wildcats.
- **Load data.** Every published load in the library for a cartridge (bullet, powder, charge, velocity, barrel, pressure, COAL, source link), and your own loads with the same fields. Your loads stay in your browser, with JSON export and import, and your max loads feed that cartridge's velocity estimates.

## How the numbers are made

| What | Model | Notes |
| --- | --- | --- |
| Trajectory | Point-mass (3-DOF), G1/G7 drag tables, RK4 (`src/lib/ballistics/`) | Checked against py-ballisticcalc 3.1.1 to within 0.25% out to 1,500 yd. |
| Velocity, no published loads | `physics-v1` (`src/lib/velocity/physics.ts`) | Gas expansion from case into bore. Three constants fitted to 27 factory velocities. Assumes a maximum-pressure load. About 2% typical error; its median is about 2% above Vihtavuori's published maximum loads. |
| Velocity, with published loads | `loglog-v1` (`src/lib/velocity/loadData.ts`) | Fastest maximum load per bullet weight, moved to your barrel length, then ln(v) fitted against ln(weight). Refuses more than 10% outside the published weights. Never uses loads above SAAMI maximum. |
| Your velocities | `loglog-v1` on your entries | Used first for that cartridge when present. |
| Matching | `src/lib/matching.ts` | Bullet diameter within 0.0015 in; status from the estimate's range. |
| Seating and fit | `src/lib/geometry.ts` | Rules of thumb: ideal COAL, seating-depth window (10% capacity loss, ogive in the neck), magazine by action class, freebore needed. |

## Data and sources

| Path | Owner | Contents |
| --- | --- | --- |
| `data/bullets/` | Bullet bot | Bullet catalogs from the makers' own sites, schema 1.2.0 |
| `data/loads/` | Load-data bot | Published load data, schema 1.0.0 |
| `data/*/comments/` | Bots | The bots' questions, answered in [`BOTS.md`](BOTS.md) |
| `data/cartridges/` | This project | Cartridge library and aliases. Every entry is still **unverified** against SAAMI/C.I.P. |
| `data/calibration/` | This project | Factory velocities the physics model is fitted to |
| `data/site-config.json` | This project | Which load sources the site may use, and the barrel range for precomputed fits |
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
- Published-load estimates mix powders, bullets and test barrels, so their ranges are wide on purpose.
- Barrel-length adjustment is a straight fps-per-inch rule; it is less reliable far from the test barrel.
- The solver ignores spin drift, Coriolis, aerodynamic jump and inclined shots.
- A BC printed without a drag model is shown but never used in trajectories.
- Seating checks are rules of thumb, not chamber drawings. Neck length is assumed to be one caliber when unknown.
- Many bullets have no published length, so seating depth can't be checked for them.
- Imperial units only.
- User data lives in one browser. Export it to keep a copy.
- Load data rows are copies from when the bots last collected them. Sources revise their data; always check the source.
