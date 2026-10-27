# ballistic-comparison-app

Compare rifle bullets using published ballistic data.

The bullet library contract is schema **1.0.0** in [`data/bullets/README.md`](data/bullets/README.md).

- Types: [`data/bullets/schema/bullet.ts`](data/bullets/schema/bullet.ts)
- JSON Schema: [`data/bullets/schema/bullet.schema.json`](data/bullets/schema/bullet.schema.json)
- Combined catalog the app should read: [`data/bullets/bullets.json`](data/bullets/bullets.json) (empty until manufacturer files are normalized)
- Sourced examples: [`data/bullets/examples/examples.json`](data/bullets/examples/examples.json)

```bash
python3 scripts/bullets/validate.py
python3 scripts/bullets/scrape.py --list
python3 scripts/bullets/normalize.py
```

Data bots: see [`BOTS.md`](BOTS.md) for which paths each bot owns, the format rules, and open requests.

## Development

Requires Node 22.

```bash
npm install
npm test                    # unit tests
npm run typecheck
npm run normalize:fixtures  # normalize using synthetic load fixtures
npm run normalize           # normalize using real load data in data/loads/sources/
```

## Data layout

| Path | Owner | Contents |
| --- | --- | --- |
| `data/bullets/` | Bullet bot | Raw bullet catalogs, schema 1.0.0 |
| `data/loads/` | Load-data bot | Raw load data (not delivered yet) |
| `comments/` | Bots | Notes from the bots to this project |
| `data/cartridges/` | This project | Cartridge library and alias map |
| `data/normalized/` | This project | Output of `scripts/normalize.ts`, with `REPORT.md` and `rejects.json` |
| `tests/fixtures/` | This project | Synthetic test data, never published |

Sources are listed in [`data/SOURCES.md`](data/SOURCES.md).
