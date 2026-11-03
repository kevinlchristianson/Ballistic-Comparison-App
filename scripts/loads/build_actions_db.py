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
 A("bat-vesper-m-medium","BAT Machine","Vesper M","Medium action","medium","remington-700-medium","bat-vm",port=3.36,faces=bf(("Standard",.485),("Magnum",.55),("338 Lapua",.60)),note="'Magazine Port: Standard (3.4\")'. Made for Unknown Munitions."),
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
out={"schemaVersion":"1.0.0","generatedOn":D,"bot":"load-data","actionCount":len(acts),"magazineCount":0,"modificationCount":0,"buildCount":len(builds),"actions":acts,"magazines":[],"modifications":[],"builds":builds}
p=pathlib.Path(__file__).resolve().parents[2]/"data/actions/bots/loads.json"
p.write_text(json.dumps(out,indent=2)+"\n"); print(len(acts),len(builds))
