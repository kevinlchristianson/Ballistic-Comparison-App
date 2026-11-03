"""Build data/loads/powders/bulk-density.json from cited sources (Lee VMD chart, Vihtavuori brochure, ammoreference.com)."""
import json, re, sys
LEE = sys.argv[1] if len(sys.argv) > 1 else '/workspace/powder/lee_vmd.json'
OUT = 'data/loads/powders/bulk-density.json'
CC_PER_GR_H2O = 0.0648  # 1 gr = 0.06480 g; water ~1.000 g/cc
SRC = {
 'lee-vmd': {'name': 'Lee Precision Volume Measure Density (VMD) chart 90058-2', 'url': 'https://images.carid.com/lee-precision/items/pdf/90058-2-measurement-chart.pdf', 'kind': 'primary (measure maker)', 'method': 'thrown', 'unit': 'cc/gr', 'methodNote': 'Volume of one grain of powder thrown through a Lee volume measure; loosest fill.'},
 'vihtavuori-2018': {'name': 'Vihtavuori Industrial Powders brochure 2018 (technical table)', 'url': 'https://vihtavuori.com/wp-content/uploads/2018/07/Vihtavuori-IP-brochure-2018_ENG_www.pdf', 'kind': 'primary (powder maker)', 'method': 'maker-bulk-density', 'unit': 'g/L', 'methodNote': 'Manufacturer bulk density; method not stated (typically poured/settled per standard test).'},
 'ammoreference': {'name': 'Ammunition Reference Database, Propellant Reference', 'url': 'https://www.ammoreference.com/propellents.php', 'kind': 'secondary (compiled)', 'method': 'compiled-bulk-density', 'unit': 'g/L', 'methodNote': 'Compiled bulk densities; column is labelled g/cm3 but values are printed in g/L (e.g. 920); stored as printed in g/L. Method not stated.'},
}
def norm(s):
    s = s.upper().replace('RELODER', 'RL').replace('ACCUR', '').replace('ACC', '')
    return re.sub(r'[^A-Z0-9]', '', s)
# --- Lee brand / type assignment (middle column has no brand header) ---
PISTOL = {'CFE PISTOL','H-PYRDX RS','H-PYRODX P','HP38','HS6','HS7','TITEGROUP','LONGSHOT','WIN 231','WIN 572','WIN ACTION PI','H110','WIN 296','H-SUPRFORM','UNIVERSAL','IMR 800X','IMR BLUE','ACCUR #2','ACCUR #5','ACCUR #7','ACCUR #9','R COMPETITION','R ENFORCER','R SILHOUETTE','R TRUE BLUE','RAM ZIP','v-3N37','V-3N38','v-N105','v-N310','v-N320','v-N330','v-N340','v-N350','ALNT 300 MP','POWER PISTOL','BULLSEYE','UNIQUE','HERC 2400','VEC BA10','VEC BA9','VEC AO','MP200','SR7625','SR4756','IMR TARGET','A NITRO100','SOLO 1000','SOLO 1500','IMR TRAIL BOSS','AUTOCOMP'}
SHOTGUN = {'CLAYS','WIN SUPER HANDI','wSUPER-FLD','wSUPER-LIT','wSUPER-TAR','INTERNATIONAL','TITEWAD','WIN AA PLUS','IMR 700X','IMR PB','IMR GREEN','IMR RED','ROYAL SCOT','ALLIANT STEEL','ALNT 410','ALNT E3','AMER-SELECT','BLUE DOT','GREEN DOT','HERCO','RED DOT','AS50','MS200'}
MUZZLE = {'PYRODEX CTG','BLACKHORN 209'}
def lee_brand(n, given):
    if given == 'WESTERN':
        return 'Ramshot' if re.match(r'^(R |RAM )|X-TERMINATOR', n) else ('Blackhorn' if 'BLACKHORN' in n else 'Accurate')
    if given: return {'ADI':'ADI','SOCHEM':'Somchem','VECTAN':'Vectan','VIHTAVUORI':'Vihtavuori','ALLIANT':'Alliant','NORMA':'Norma','HODGDON':'Hodgdon'}[given]
    if n.startswith('IMR') or n.startswith('SR'): return 'IMR'
    if n.startswith('WIN') or n.lower().startswith('wsuper') or n == 'SUPRM780': return 'Winchester'
    return 'Hodgdon'
def lee_type(n):
    if n in MUZZLE: return 'muzzleloader'
    if n in SHOTGUN: return 'shotgun'
    if n in PISTOL: return 'pistol'
    return 'rifle'
VV = {'N110':800,'N120':860,'N130':870,'N133':870,'N135':870,'N140':910,'N150':910,'N160':920,'N165':920,'N170':960,'24N41':970,'20N29':960,'N310':560,'N320':550,'N32C':420,'N330':620,'N340':620,'N350':660,'3N36':590,'3N37':720,'3N38':730,'N530':930,'N540':940,'N550':940,'N560':960,'N565':960,'N570':960}
VVTYPE = lambda p: 'pistol' if p[:2] in ('N3','3N') else 'rifle'
rows = []
for r in json.load(open(LEE)):
    n = r['name']; b = lee_brand(n, r['labelBrand'])
    rows.append({'brand': b, 'powder': n, 'type': lee_type(n), 'source': 'lee-vmd', 'valuePrinted': r['vmdCcPerGr'], 'unit': 'cc/gr', 'grPerGrH2O': round(CC_PER_GR_H2O / r['vmdCcPerGr'], 3), 'notes': 'Name as printed on the Lee chart.' + ('' if r['labelBrand'] else ' Brand inferred from name (middle column has no brand header).')})
for p, v in VV.items():
    rows.append({'brand': 'Vihtavuori', 'powder': p, 'type': VVTYPE(p), 'source': 'vihtavuori-2018', 'valuePrinted': v, 'unit': 'g/L', 'grPerGrH2O': round(v/1000, 3), 'notes': None})
AR = json.load(open('/tmp/ammoref.json'))
for b, p, t, v in AR:
    rows.append({'brand': b, 'powder': p, 'type': t, 'source': 'ammoreference', 'valuePrinted': v, 'unit': 'g/L', 'grPerGrH2O': None if v is None else round(v/1000, 3), 'notes': 'Value printed under a g/cm3 header but in g/L magnitude.' if v else 'No bulk density printed.'})
json.dump({'schemaVersion': '1.0.0', 'description': 'Powder bulk density relative to water: grains of powder that fill the volume of one grain of water.', 'conversion': {'ccPerGrH2O': CC_PER_GR_H2O, 'fromCcPerGr': 'grPerGrH2O = 0.0648 / ccPerGr', 'fromGPerL': 'grPerGrH2O = gPerL / 1000'}, 'sources': SRC, 'rows': rows}, open(OUT, 'w'), indent=1)
print(len(rows))
