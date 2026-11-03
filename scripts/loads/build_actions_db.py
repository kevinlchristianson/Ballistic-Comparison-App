"""Builds data/actions/bots/loads.json (schema actions 1.0.0). Actions and builds only; magazines/modifications are the bullet bot's."""
import json, pathlib
D="2026-11-03"
def src(name,url,kind): return {"name":name,"url":url,"retrievedOn":D,"kind":kind}
S={
 "zm-origin":src("Zermatt Arms - Origin Action","https://www.zermattarms.com/?product=origin","maker"),
 "zm-cmp":src("Zermatt Arms - Our Actions (compare table)","https://www.zermattarms.com/?page_id=3078","maker"),
 "jb-cmp":src("JAWBONE - Compare Bolt Actions","https://jawboneactions.com/compare/","retailer"),
 "jb-737":src("JAWBONE - Impact 737R vs Lone Peak Fuzion","https://jawboneactions.com/impact-737r-short-action-vs-lone-peak-fuzion/","retailer"),
 "jb-razor":src("JAWBONE - Lone Peak Razor","https://jawboneactions.com/actions/lone-peak-razor/","retailer"),
 "jb-fti":src("JAWBONE - Lone Peak Fuzion-Ti","https://jawboneactions.com/actions/lone-peak-fuzion-ti/","retailer"),
 "gb-lpa":src("Go Big Tactical - Lone Peak Fuzion Medium Length MAG BF","https://gobigtactical.ca/Lone-Peak-Fuzion-Medium-Length-Right-hand-MAG-BF/","retailer"),
 "def-rebel":src("Defiance Machine - Rebel Hybrid Port","https://defiancemachine.com/actions/rebel/rebel-hybrid-port/","maker"),
 "def-names":src("Defiance Machine - Length Naming Changes","https://defiancemachine.com/defiance-length-naming-changes/","maker"),
 "bor-rr":src("Borden Accuracy - Rimrock Actions","https://bordenrifles.com/rimrock-actions/","maker"),
 "bor-hunt":src("Borden Accuracy - Alpine, Ridgeline, Mountaineer, and Timberline Actions","https://bordenrifles.com/alpine-ridgeline-mountaineer-and-timberline-actions/","maker"),
 "st-30":src("Stiller - TAC 30","https://stilleractions.horizonfirearms.com/actions/tac-30","maker"),
 "st-338":src("Stiller - TAC 338","https://stilleractions.horizonfirearms.com/actions/tac-338","maker"),
 "kel":src("Kelbly - Atlas Action","https://kelbly.com/actions-steel-atlas/","maker"),
 "kel-of":src("Kelbly - Atlas Tactical Order Form","https://kelbly.com/product/atlas-tactical-order-form/","maker"),
 "ter":src("Terminus Actions - The Actions","https://terminusactions.com/actions/","maker"),
 "cur":src("Curtis Custom - Axiom","https://curtiscustom.com/product/axiom-4/","maker"),
 "bat":src("BAT Machine - BAT Actions","https://www.batmachine.com/bat-actions/","maker"),
 "bat-vm":src("BAT Machine - Vesper M","https://www.batmachine.com/actions/model-hr/vesper-m/","maker"),
 "pie":src("Pierce Engineering - Rifle Actions","https://www.pierceengineeringltd.com/product-category/rifle-actions/","maker"),
 "arc":src("American Rifle Company - Mausingfield Bolt Action","https://www.americanrifle.com/shop/mausingfield-bolt-action-short-action-open-top-2?search=Action","maker"),
}
R7S,R7L="remington-700-short","remington-700-long"
def bf(*p): return [{"label":l,"diameter":d} for l,d in p]
def A(id,maker,model,variant,lc,fp,s,clone="remington-700-long",faces=None,travel=None,port=None,rlen=None,mag=None,single=None,fs=None,note=None):
  if fp==R7S and clone=="remington-700-long": clone="remington-700-short"
  if fp not in (R7S,R7L): clone=None
  return {"id":id,"maker":maker,"model":model,"variant":variant,"lengthClass":lc,"footprint":fp,"cloneOf":clone,"lengthUnit":"in",
   "boltFaces":faces or [],"boltTravel":travel,"ejectionPortLength":port,"receiverLength":rlen,"magazineIds":None,
   "maxCoalMagazine":mag,"maxCoalSingleFeed":single,"source":S[s],"fieldSources":{k:S[v] for k,v in (fs or {}).items()},"note":note}
MAGNOTE="magazineIds null: the bullet bot files magazines and its ids are not fixed yet."
acts=[
 A("remington-700-short","Remington","700","Short action","short",R7S,"def-names",clone=None,note="Reference footprint record; no Remington spec page found. Source is Defiance's page relating its lengths to Rem SA/LA. "+MAGNOTE),
 A("remington-700-long","Remington","700","Long action","long",R7L,"def-names",clone=None,note="Reference footprint record; no Remington spec page found. Factory box length left null (only community figures found). "+MAGNOTE),
 # Zermatt / Bighorn
 A("zermatt-origin-short","Zermatt Arms","Origin","Short action","short",R7S,"zm-cmp",mag=2.980,note="Compare table: 2.980 (DBM Only)."),
 A("zermatt-origin-medium","Zermatt Arms","Origin","Medium action","medium","zermatt-medium","zm-cmp",mag=3.235,note="Compare table 3.235; the Origin product page prints 3.250 for medium BDL/AICS. Conservative end copied."),
 A("zermatt-origin-long","Zermatt Arms","Origin","Long action","long",R7L,"zm-origin",faces=bf(("magnum",None)),mag=3.850,note="'COAL's of 3.850\" (CIP Length)'; compare table: DBM only, no Wyatt's extended box."),
 A("zermatt-tl3-short","Zermatt Arms","TL3 (Bighorn)","Short action","short",R7S,"zm-cmp",mag=2.980),
 A("zermatt-tl3-medium","Zermatt Arms","TL3 (Bighorn)","Medium action","medium","zermatt-medium","zm-cmp",mag=3.235),
 A("zermatt-tl3-long","Zermatt Arms","TL3 (Bighorn)","Long action","long",R7L,"zm-cmp",mag=3.850),
 A("zermatt-sr3-short","Zermatt Arms","SR3 (Bighorn)","Short action","short",R7S,"zm-cmp",mag=3.000),
 A("zermatt-sr3-medium","Zermatt Arms","SR3 (Bighorn)","Medium action","medium","zermatt-medium","zm-cmp",mag=3.235),
 A("zermatt-sr3-long","Zermatt Arms","SR3 (Bighorn)","Long action","long",R7L,"zm-cmp",mag=3.830,note="Takes Wyatt's extended box."),
 A("zermatt-ti3-short","Zermatt Arms","Ti3","Short action","short",R7S,"zm-cmp",mag=2.980,note="Table: 2.980\"/3.000\" (DBM/BDL); lower copied."),
 A("zermatt-ti3-medium","Zermatt Arms","Ti3","Medium action","medium","zermatt-medium","zm-cmp",mag=3.235),
 A("zermatt-ti3-long","Zermatt Arms","Ti3","Long action","long",R7L,"zm-cmp",mag=3.830,note="Table: 3.850\"/3.830\" (DBM/BDL); lower copied."),
 # Defiance
 A("defiance-rebel-short","Defiance Machine","Rebel","Short (Rem. SA)","short",R7S,"def-rebel",note="Defiance renamed lengths Jan 2024 (def-names). Same lengths offered on Deviant, Ruckus, anTi."),
 A("defiance-rebel-xm","Defiance Machine","Rebel","XM","medium","defiance-xm","def-rebel",mag=3.200,note="'XM (3.200\" max cartridge length) requires XM BDL KIT'. Proprietary length, not the industry medium."),
 A("defiance-rebel-medium","Defiance Machine","Rebel","Medium (industry standard, previously XM Plus)","medium","zermatt-medium","def-rebel",note="Same screw spacing as Lone Peak/Zermatt/Stiller medium per Defiance."),
 A("defiance-rebel-long","Defiance Machine","Rebel","Long (Rem. LA)","long",R7L,"def-rebel"),
 # Impact
 A("impact-737r-short","Impact Precision","737R","Short","short",R7S,"jb-737",faces=bf((".223",.378),("6mm ARC",.441),(".308",.473),("Magnum",.532)),mag=2.960,note="'Feeds to 2.960\" OAL' (AW/AICS cut)."),
 A("impact-ma-nbk-medium","Impact Precision","MA NBK","Medium","medium","zermatt-medium","jb-cmp",faces=bf(("Magnum",.532)),note="Cut for AICS and Hawkins Hunter. Footprint assumed industry medium: UNVERIFIED, check."),
 A("impact-la-nbk-long","Impact Precision","LA NBK","Long","long",R7L,"jb-cmp",faces=bf((".308",.473),("Magnum",.532)),mag=3.6,note="'Cut for AICS and Hawkins Hunter, to 3.6\" OAL'."),
 A("impact-777r-long","Impact Precision","777R","Long","long",R7L,"jb-cmp",faces=bf((".308",.473),("Magnum",.532)),note="BDL and DBM compatible."),
 A("impact-787r-long","Impact Precision","787R","Long","xl",R7L,"jb-cmp",faces=bf(("Magnum",.532),("Lapua",.588)),note="Threads 1-1/16 x 20."),
 # Lone Peak
 A("lonepeak-fuzion-short","Lone Peak Arms","Fuzion","Short","short",R7S,"gb-lpa",mag=2.995,note="Wyatt MBE-4 short box internal length 2.995 as listed; AW cut standard."),
 A("lonepeak-fuzion-medium","Lone Peak Arms","Fuzion","Medium","medium","zermatt-medium","gb-lpa",faces=bf(("MAG",None)),mag=3.225,note="'Wyatt BDL internal overall length ... Medium Action(3.225\")'."),
 A("lonepeak-fuzion-long","Lone Peak Arms","Fuzion","Long","long",R7L,"gb-lpa",mag=3.825,fs={"boltFaces":"jb-737"},faces=bf((".308",.473),("Magnum",.532),(".338 Magnum",.588)),note="MBE-3 long box 3.825."),
 A("lonepeak-razor-long","Lone Peak Arms","Razor","Long","long",R7L,"jb-razor",faces=bf(("Magnum",.532)),mag=3.825,note="Wyatt MBE-3 long (3.825\")."),
 A("lonepeak-razor-short","Lone Peak Arms","Razor","Short","short",R7S,"jb-razor",faces=bf((".308",.473)),mag=2.995,note="Wyatt MBE-4 short (2.995\")."),
 # Borden
 A("borden-mountaineer-short","Borden Accuracy","Mountaineer","Short action, integrated lug","short",R7S,"bor-hunt",port=2.75,rlen=8.1),
 A("borden-mountaineer-long","Borden Accuracy","Mountaineer","Long action, integrated lug","long",R7L,"bor-hunt",port=3.5,rlen=8.94),
 A("borden-alpine-short","Borden Accuracy","Alpine","Short","short",R7S,"bor-hunt",port=2.4,rlen=7.85,note="Alpine Magnum port 2.75."),
 A("borden-ridgeline-medium","Borden Accuracy","Ridgeline","Mid-length","medium","borden-ridgeline","bor-hunt",note="'Hybrid Rem 700' inlet; '3.2\" mag well' (well, not COAL)."),
 A("borden-timberline-long","Borden Accuracy","Timberline","Long","long",R7L,"bor-hunt",port=3.25,rlen=8.69,note="Timberline Magnum port 3.5."),
 A("borden-bigfoot-xl","Borden Accuracy","Bigfoot","Modified Rem 700 Long","xl","borden-bigfoot","bor-hunt",note=".338 Lapua & Norma Magnum; CFE12/CIP mag systems."),
 A("borden-rimrock-brl-long","Borden Accuracy","Rimrock BRL","Long","long",None,"bor-rr",rlen=8.875,note="Single-shot benchrest family; port 3.5 per Rifleman's Journal reprint (not filed)."),
 # Stiller
 A("stiller-tac30-short","Stiller","TAC 30","Short","short",R7S,"st-30",rlen=7.85,mag=2.97,note="'Magwell OAL (If Repeater) 2.97\" (3.10\" Mag)'. Medium/long lengths exist but no maker spec fetched."),
 A("stiller-tac338-xl","Stiller","TAC 338","Long magnum","xl","stiller-tac338","st-338",rlen=9.165,mag=3.944,note="'Magwell OAL (If Repeater): 3.944\"' (magwell, may exceed COAL)."),
 # Kelbly
 A("kelbly-atlas-short","Kelbly","Atlas","Short","short",R7S,"kel",faces=bf(("222",None),("PPC/ARC",None),("308",None),("Mag.",.532)),rlen=7.860),
 A("kelbly-atlas-long","Kelbly","Atlas","Long","long",R7L,"kel",faces=bf(("308",None),("Mag.",.532)),rlen=8.7100,fs={"note":"kel-of"},note="Long: ADL/BDL cut, compatible with AICS/CIP magazines (order form)."),
 # Terminus
 A("terminus-zeus-short","Terminus Actions","Zeus","Short action","short",R7S,"ter",faces=bf((".223",None),(".308",None),(".445 ARC/PPC",.445),("Mag",None))),
 A("terminus-zeus-long","Terminus Actions","Zeus","Long action","long",R7L,"ter",faces=bf((".308",None),("Mag",None),("Lapua",None))),
 A("terminus-kratos-x-long","Terminus Actions","Kratos X","Long action","xl",R7L,"ter",port=3.8,faces=bf((".308",None),("Mag",None),(".590",.590)),note="'Accepts AI style mags and 4.0\" internal box mags'; 'True 4.00\" Bolt Strike'."),
 # Curtis
 A("curtis-axiom-short","Curtis Custom","Axiom","Short action","short",R7S,"cur",faces=bf((".223/300blk",.390),("Valkyrie",.420),("ARC",.450),(".308",.480),("magnum",.540)),note="Listed as discontinued."),
 # BAT
 A("bat-vesper-m-medium","BAT Machine","Vesper M","Medium action","medium","zermatt-medium","bat-vm",port=3.36,faces=bf(("Standard",.485),("Magnum",.55),("338 Lapua",.60)),note="'Magazine Port: Standard (3.4\")'. Made for Unknown Munitions."),
 A("bat-vesper-s-short","BAT Machine","Vesper S","Short","short",R7S,"bat"),
 A("bat-vesper-long","BAT Machine","Vesper","Long","long",R7L,"bat"),
 A("bat-igniter-short","BAT Machine","Igniter","Short","short",R7S,"bat",note="Takes all Rem 700 SA bottom metal incl. extended boxes."),
 A("bat-igniter-la-long","BAT Machine","Igniter LA","Long","long",R7L,"bat",note="Takes all Rem 700 LA bottom metal incl. extended boxes."),
 A("bat-hr-long","BAT Machine","HR","Long","long",R7L,"bat"),
 A("bat-hammerhead-short","BAT Machine","Hammerhead","Short","short",R7S,"bat"),
 # Pierce
 A("pierce-core-ss","Pierce Engineering","CORE SS","Short or long",None,R7S,"pie",clone="remington-700-short",note="Catalog lists short/long; per-length specs not fetched."),
 A("pierce-338xl-magnum","Pierce Engineering","338 XL Magnum","Repeater","xl",None,"pie"),
 # ARC
 A("arc-mausingfield-short","American Rifle Company","Mausingfield","Short","short",R7S,"arc",note="ARC terms of use bar collecting product text; numbers withheld pending Kevin."),
 A("arc-mausingfield-long","American Rifle Company","Mausingfield","Long","long",R7L,"arc",note="ARC terms of use bar collecting product text; numbers withheld pending Kevin."),
]
builds=[{"id":"r700-long-mbe3-28-nosler-berger-195","actionId":"remington-700-long","magazineId":None,"modificationIds":None,"cartridge":"28 Nosler","lengthUnit":"in","coal":3.740,"feeds":"magazine",
 "source":src("Community: Long Range Hunting - 28 Nosler COAL problem","https://www.longrangehunting.com/threads/28-nosler-coal-problem.185900/","community"),
 "note":"Trued Rem 700 BDL, Wyatt MBE-3 (3.825 in interior). Poster: 'I have yet to shoot this rifle' - fit only, feeding not reported. magazineId/modificationIds null: bullet bot ids not fixed yet."}]
# Links to Bullet Database (bullets.json) ids, Win 70 LA (added after #332/#333).
SA_BOXES=["wyatts-mbe-04","wyatts-mbe-05","wyatts-6-5-prc-extended","wyatts-cfe-05","wyatts-cfe-06","wyatts-sa-3-100-baney","wyatts-223-extended"]
LA_BOXES=["wyatts-mbe-02","wyatts-mbe-03","wyatts-300-prc-extended","wyatts-cfe-12","wyatts-cfe-09","wyatts-cfe-13","wyatts-rem-700-la-factory","wyatts-rum-factory"]
for _a in acts:
    if _a["id"] in ("remington-700-short","remington-700-long"):
        _a["magazineIds"]=SA_BOXES if _a["id"].endswith("short") else LA_BOXES
        _a["note"]='Reference footprint record; no Remington spec page found. Factory box length left null (only community figures found). magazineIds: every Bullet Database (bullets.json) box whose fitsFootprints lists this footprint.'
acts.append({'id': 'winchester-70-long', 'maker': 'Winchester', 'model': 'Model 70', 'variant': 'Long action', 'lengthClass': 'long', 'footprint': 'winchester-70-long', 'cloneOf': None, 'lengthUnit': 'in', 'boltFaces': [], 'boltTravel': None, 'ejectionPortLength': None, 'receiverLength': None, 'magazineIds': ['wyatts-mbe-08'], 'maxCoalMagazine': None, 'maxCoalSingleFeed': None, 'source': {'name': 'Winchester - Model 70 Featherweight', 'url': 'https://www.winchesterguns.com/products/rifles/model-70/model-70-featherweight.html', 'retrievedOn': '2026-11-03', 'kind': 'maker'}, 'fieldSources': {}, 'note': "Maker page prints 'Action Length Long Action' and 'Magazine Type Hinged Floorplate' but no box, port or receiver dimensions, so numbers are null. Footprint id matches Bullet Database's winchester-70-long records; magazineIds from bullets.json."})
builds[0]["magazineId"]="wyatts-mbe-03"
builds[0]["modificationIds"]=['wyatts-r700-mortise-mill-rearward', 'wyatts-r700-bolt-stop-shorten-110']
builds[0]["note"]="Trued Rem 700 BDL, Wyatt MBE-3 (3.825 in interior). Poster: 'I have yet to shoot this rifle' - fit only, feeding not reported. modificationIds: the Rem 700 mods Bullet Database lists for wyatts-mbe-03, minus the box-lips mod (Wyatt's: Ultra Mags only). The post does not itemise them."

# Expansion (2026-11-03 11:32 request; Kevin's 11:36 approval for factory actions + LRH community chart on maxCoalMagazine).
S.update({
 "lrh":src("Community: Long Range Hunting - List / index of factory rifle magazine lengths (2020-09-14 LRH Mag COAL Chart)","https://www.longrangehunting.com/threads/list-index-of-factory-rifle-magazine-lengths-please-contribute-data.247311/","community"),
 "sur":src("Surgeon Rifles - 2017 Catalog (maker catalog, hosted by Modular Rifle)","https://modularrifle.com/wp-content/uploads/2017/07/2017-Surgeon-Rifles-Catalog.pdf","maker"),
 "st-hy":src("Stiller - Hyrax","https://stilleractions.horizonfirearms.com/actions/hyrax-action","maker"),
 "st-pr":src("Stiller - Predator","https://stilleractions.horizonfirearms.com/actions/predator","maker"),
 "st-pv":src("Stiller - Predator V","https://stilleractions.horizonfirearms.com/actions/predator-v","maker"),
 "st-300":src("Stiller - TAC 300","https://stilleractions.horizonfirearms.com/actions/tac-300","maker"),
 "st-wo":src("Stiller - Wombat","https://stilleractions.horizonfirearms.com/actions/wombat","maker"),
 "st-13":src("Stiller - Mark 13","https://stilleractions.horizonfirearms.com/actions/mark-13","maker"),
 "def-cmp":src("Defiance Machine - Actions (comparison)","https://defiancemachine.com/actions/","maker"),
 "berg":src("Bergara - Premier Actions & Barreled Actions","https://www.bergara.online/us/rifles/premier/premier-actions-barreled-actions/","maker"),
 "cz600":src("CZ - CZ 600 Series Technical Data (PDF)","https://czubstrapiwebsitestorage.blob.core.windows.net/strapi-uploads/assets/cz_600_series_en_technical_data_6bbb320249.pdf","maker"),
 "w70":src("Winchester - Model 70 Featherweight","https://www.winchesterguns.com/products/rifles/model-70/model-70-featherweight.html","maker"),
 "xpr":src("Winchester - XPR","https://www.winchesterguns.com/products/rifles/xpr/xpr.html","maker"),
 "xb2":src("Browning - X-Bolt 2 Hunter","https://www.browning.com/products/firearms/rifles/x-bolt-2/xbolt-2-hunter.html","maker"),
 "sav-al":src("Savage Arms - Savage Action Lengths: Long Action vs Short Action","https://savagearms.com/blog/post/savage-action-lengths-long-action-vs-short-action","maker"),
 "sav-ax":src("Savage Arms - Axis","https://savagearms.com/firearms/model/axis","maker"),
 "wby5":src("Weatherby - Mark V","https://www.weatherby.com/mark-v/","maker"),
 "wbyv":src("Weatherby - Vanguard","https://www.weatherby.com/vanguard/","maker"),
 "spr":src("Springfield Armory - Model 2020 Series Rifles","https://www.springfield-armory.com/model-2020-series-rifles/","maker"),
 "ai-at":src("Accuracy International - AT-X Mil","https://www.accuracyinternational.com/at-xmil","maker"),
 "ai-ax":src("Accuracy International - AXSR Long Action","https://www.accuracyinternational.us/AXSR-long-action-multi-calibre-sporting-rifle","maker"),
 "dt":src("Desert Tech - SRS M2","https://deserttech.com/srs-m2-rifle","maker"),
 "m98":src("Mauser - 98 Magnum Diplomat","https://mauser.com/en/MAUSER-98-Magnum-Diplomat/80112504","maker"),
 "tik":src("Tikka - T3x","https://www.tikka.us/rifles/tikka-t3x","maker"),
 "bla":src("Blaser - R8","https://www.blaser.de/en/r8","maker"),
})
LRHN="Community LRH chart (fieldSources.maxCoalMagazine); measured factory boxes, not maker-printed. Chart row: "
X=[
 # Surgeon (catalog: works with Rem 700 stocks)
 A("surgeon-591-short","Surgeon Rifles","591","Short action","short",R7S,"sur",faces=bf((".473",.473),("WSM",.550)),port=2.500,rlen=8.125,note="Catalog: length 8.125, ejection port 2.500, loading port 2.940."),
 A("surgeon-1086-long","Surgeon Rifles","1086","Long action","long",R7L,"sur",faces=bf((".473",.473),(".550",.550)),port=3.350,rlen=8.975,note="Catalog: length 8.975, ejection port 3.350, loading port 3.800."),
 A("surgeon-1581-xl","Surgeon Rifles","1581","XL action","xl","surgeon-1581","sur",faces=bf((".473",.473),(".550",.550),(".590",.590)),rlen=9.500,note="Catalog: length 9.500, loading port 3.900 (ejection port not printed)."),
 # Stiller
 A("stiller-hyrax-short","Stiller","Hyrax","Short","short",R7S,"st-hy",rlen=7.85,note="'Magwell Cut: Extended Remington 700' (no OAL printed)."),
 A("stiller-hyrax-long","Stiller","Hyrax","Long","long",R7L,"st-hy",rlen=8.70,note="'Magwell Cut: Extended Remington 700' (no OAL printed)."),
 A("stiller-predator-short","Stiller","Predator","Short","short",R7S,"st-pr",rlen=7.85,mag=2.97,note="'Magwell OAL 3.10\" (3.215\" Mag) (2.97\" Light)'; conservative 2.97 copied. Bolt faces Light/Midsize/Standard/Magnum."),
 A("stiller-predator-medium","Stiller","Predator","Medium","medium",None,"st-pr",rlen=8.20,mag=3.32,note="'Magwell OAL 3.32\"'. Standard/Magnum faces. Footprint not stated for medium."),
 A("stiller-predator-long","Stiller","Predator","Long","long",R7L,"st-pr",rlen=8.70,mag=3.95,note="'Magwell OAL 3.95\"' (magwell, may exceed COAL)."),
 A("stiller-predator-v-short","Stiller","Predator V","Short single shot","short",R7S,"st-pv",rlen=7.85),
 A("stiller-tac300-long","Stiller","TAC 300","Long","long",R7L,"st-300",rlen=8.70,mag=3.82,note="'Magwell OAL 3.82\"'. Standard & Magnum faces."),
 A("stiller-wombat-short","Stiller","Wombat","Short","short",R7S,"st-wo",faces=bf(("Standard",.485),("Magnum",.550)),rlen=7.85,mag=3.10,note="'Magwell OAL 3.10\" (3.215\" Mag)'; conservative copied."),
 A("stiller-wombat-long","Stiller","Wombat","Long","long",R7L,"st-wo",rlen=8.70,mag=3.95,note="'Magwell OAL 3.95\"'."),
 A("stiller-mark13-long","Stiller","Mark 13","Long magnum","long",R7L,"st-13",rlen=8.70,mag=3.95,note="'Magwell OAL 3.95\"'."),
 # Bergara
 A("bergara-premier-bpsa-short","Bergara","Premier","BPSA Short Standard","short",R7S,"berg",faces=bf(("Standard",.470))),
 A("bergara-premier-bpsa-prc-short","Bergara","Premier","BPSA-PRC Short Magnum","short",R7S,"berg",faces=bf(("Magnum",.540))),
 A("bergara-premier-bpla-long","Bergara","Premier","BPLA Long Magnum","long",R7L,"berg",faces=bf(("Magnum",.540))),
 # CZ 600
 A("cz-600-mini","CZ","600","Size I","mini","cz-600-i","cz600"),
 A("cz-600-medium","CZ","600","Size II (.308, 6.5 CM, 6.5 PRC)","short","cz-600-ii","cz600",note="Maker calls it Size II; lengthClass short by its chamberings."),
 A("cz-600-long","CZ","600","Size III (30-06, 8x57, 300 WM)","long","cz-600-iii","cz600"),
 # Winchester
 A("winchester-70-short","Winchester","Model 70","Short action","short","winchester-70-short","w70",mag=2.850,fs={"maxCoalMagazine":"lrh"},note=LRHN+"'Winchester 70 SA - .243 2.850'. Maker prints 'Action Length Short Action' (incl. WSM, 6.5 PRC)."),
 A("winchester-xpr-short","Winchester","XPR","Short action","short","winchester-xpr-short","xpr"),
 A("winchester-xpr-long","Winchester","XPR","Long action","long","winchester-xpr-long","xpr",note="Long Action incl. 7 RM, 300/338 WM."),
 # Browning
 A("browning-xbolt2-short","Browning","X-Bolt 2","Short action","short","browning-xbolt-short","xb2"),
 A("browning-xbolt2-long","Browning","X-Bolt 2","Long action","long","browning-xbolt-long","xb2"),
 # Savage
 A("savage-110-short","Savage Arms","110","Short action","short","savage-110-short","sav-al",rlen=8.40),
 # LRH row removed from pending set: chart gives 'Savage 112 7MM RM 3.505', '114 LA-Magnum 3.500', '116 LA-Magnum 3.518' (more than one figure).
 A("savage-110-long","Savage Arms","110","Long action","long","savage-110-long","sav-al",rlen=9.25),
 A("savage-axis-short","Savage Arms","Axis","Short action","short","savage-axis","sav-al",rlen=6.961,mag=2.998,fs={"maxCoalMagazine":"lrh"},note=LRHN+"'Savage Axis 6.5CM 2.998' / '.243 Win 2.998'. Blog: Axis receiver 6.961 for both lengths."),
 A("savage-axis-long","Savage Arms","Axis","Long action","long","savage-axis","sav-al",rlen=6.961),
 # Weatherby
 A("weatherby-markv-6lug","Weatherby","Mark V","6-lug","short","weatherby-markv-6lug","wby5",faces=bf(("6-lug",.477)),note="lengthClass short per 'Standard Short Action' wording."),
 A("weatherby-markv-9lug","Weatherby","Mark V","9-lug","magnum","weatherby-markv-9lug","wby5",faces=bf(("9-lug",.536),("9-lug large",.588)),note="Maker: '.536\"-.588\"' bolt face."),
 A("weatherby-vanguard","Weatherby","Vanguard",None,None,"weatherby-vanguard","wbyv",note="Maker page prints model only. LRH chart has 300WM 3.520 / 300 Wby 3.575 by chambering; not filed against the whole model."),
 # Springfield
 A("springfield-2020-short","Springfield Armory","Model 2020","Short Action","short","springfield-2020-short","spr"),
 A("springfield-2020-short-magnum","Springfield Armory","Model 2020","Short Action Magnum","short","springfield-2020-short","spr"),
 A("springfield-2020-long","Springfield Armory","Model 2020","Long Action","long","springfield-2020-long","spr"),
 A("springfield-2020-long-magnum","Springfield Armory","Model 2020","Long Action Magnum","magnum","springfield-2020-long","spr"),
 # AI
 A("ai-atx-short","Accuracy International","AT-X","Short action","short","ai-at","ai-at"),
 A("ai-axsr-long","Accuracy International","AXSR","Long action","long","ai-axsr","ai-ax",note=".338 LM / 300 WM etc."),
 # Desert Tech
 A("deserttech-srs-m2-short","Desert Tech","SRS M2","Short","short","deserttech-srs","dt"),
 A("deserttech-srs-m2-long","Desert Tech","SRS M2","Long","long","deserttech-srs","dt"),
 A("deserttech-srs-m2-magnum","Desert Tech","SRS M2","Magnum","magnum","deserttech-srs","dt"),
 # Mauser
 A("mauser-98-standard","Mauser","98","Standard","long","mauser-98-standard","m98",mag=3.250,fs={"maxCoalMagazine":"lrh"},note=LRHN+"'Mauser 98 8MM Mauser 3.250'."),
 A("mauser-98-magnum","Mauser","98","Magnum","magnum","mauser-98-magnum","m98"),
 # Model-only
 A("tikka-t3x","Tikka","T3x",None,None,"tikka-t3x","tik",note="Maker page prints model only. LRH chart lists 2.340 (223), 2.840 (308), 3.560 (LA-Magnum); not filed against one record."),
 A("blaser-r8","Blaser","R8",None,None,"blaser-r8","bla",note="Maker page prints model only (straight pull, swap barrels). LRH chart: 'R8 LA 3.620'; not filed (model-wide record)."),
]
for n in ["Misfit"]:
  for l,lc,fp in [("Short","short",R7S),("Long","long",R7L)]:
    X.append(A(f"defiance-{n.lower()}-{lc}","Defiance Machine",n,l,lc,fp,"def-cmp"))
for n in ["Renegade","Deviant","Ruckus","anTi","anTi X","Ti","Ti X"]:
  for l,lc,fp in [("Short","short",R7S),("Medium (previously XM Plus)","medium","zermatt-medium"),("Long","long",R7L)]:
    X.append(A(f"defiance-{n.lower().replace(' ','-')}-{lc}","Defiance Machine",n,l,lc,fp,"def-cmp",note="Ruckus faces '.390 to .595' per maker." if n=="Ruckus" else None))
for n in ["Deviant Elite","Deviant Elite X","Outcast"]:
  X.append(A(f"defiance-{n.lower().replace(' ','-')}-short","Defiance Machine",n,"Short","short",R7S,"def-cmp"))
acts.extend(X)
# src/lib/actions.ts (communityMisuse) rejects community fieldSources on actions; chart values are held until the app allows them.
LRH_ON=False
def _off(a):
  if not LRH_ON and "maxCoalMagazine" in a["fieldSources"]: a.update(maxCoalMagazine=None,fieldSources={},note=a["note"].split(" "+LRHN)[0].split(LRHN)[0] or None)
for _a in acts:
  # LRH row removed from pending set (remington-700-short): chart gives 'Remington 700 SA 2.850', '700 308 Win 2.845', '700 300WSM Accurate - 2.95' (more than one figure).
  # LRH row removed from pending set (remington-700-long): chart gives 'Remington 700 LA-Magnum 3.710', '700 7MM RM 3.710 ADL & BDL', '700-HS Precision LA 3.695' (more than one figure).
  # LRH row removed from pending set (winchester-70-long): chart gives 'Winchester 70 LA 3.400', '70 LA-Magnum 3.600 7 STW, 300 WBY 375 H&H are 3.6' (more than one figure).
  pass

for _a in acts: _off(_a)

out={"schemaVersion":"1.0.0","generatedOn":D,"bot":"load-data","actionCount":len(acts),"magazineCount":0,"modificationCount":0,"buildCount":len(builds),"actions":acts,"magazines":[],"modifications":[],"builds":builds}
p=pathlib.Path(__file__).resolve().parents[2]/"data/actions/bots/loads.json"
p.write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n"); print(len(acts),len(builds))
