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
