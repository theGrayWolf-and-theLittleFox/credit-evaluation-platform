import sharp from "/Users/andy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const OUT = "/Users/andy/credit-evaluation-platform/deliverables/inclusive-credit-system-design-package/diagrams";
const W = 1600;
const H = 980;
const C = {
  ink: "#172B4D", muted: "#52616F", line: "#AAB7C4", navy: "#153B64",
  blue: "#2E74B5", cyan: "#DDEFFC", green: "#DFF2E1", greenLine: "#2E7D32",
  amber: "#FFF1CC", amberLine: "#A96400", red: "#FCE1E0", redLine: "#B3261E",
  gray: "#F4F6F8", white: "#FFFFFF", purple: "#EEE5F7", purpleLine: "#6941A5"
};

const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const lines = (text, max = 30) => {
  const words = String(text).split(/\s+/); const out = []; let row = "";
  for (const word of words) {
    if ((row + " " + word).trim().length > max && row) { out.push(row); row = word; }
    else row = (row + " " + word).trim();
  }
  if (row) out.push(row); return out;
};
const text = (x, y, value, {size=20, weight=400, fill=C.ink, anchor="start", family="Arial"}={}) =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(value)}</text>`;
const multi = (x, y, value, {size=18, weight=400, fill=C.ink, anchor="start", gap=24, max=32}={}) =>
  lines(value, max).map((row,i)=>text(x,y+i*gap,row,{size,weight,fill,anchor})).join("");
const rect = (x,y,w,h,{fill=C.white,stroke=C.line,sw=2,rx=8,dash=""}={}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash?` stroke-dasharray="${dash}"`:""}/>`;
const line = (x1,y1,x2,y2,{stroke=C.line,sw=2,dash="",arrow=true}={}) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash?` stroke-dasharray="${dash}"`:""}${arrow?' marker-end="url(#arrow)"':""}/>`;
const path = (d,{stroke=C.line,sw=2,dash="",arrow=true,fill="none"}={}) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash?` stroke-dasharray="${dash}"`:""}${arrow?' marker-end="url(#arrow)"':""}/>`;
const node = (x,y,w,h,title,detail,opt={}) => `${rect(x,y,w,h,opt)}${text(x+16,y+29,title,{size:19,weight:700,fill:opt.titleFill||C.navy})}${multi(x+16,y+55,detail,{size:15,fill:C.muted,gap:20,max:Math.floor(w/9.2)})}`;
const tag = (x,y,label,fill=C.gray,stroke=C.line) => `${rect(x,y,label.length*9+24,28,{fill,stroke,sw:1,rx:14})}${text(x+12,y+19,label,{size:13,weight:700,fill:C.ink})}`;
const base = (title, subtitle) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker><filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12"/></filter></defs><rect width="1600" height="980" fill="#FFFFFF"/>${text(56,58,title,{size:30,weight:700,fill:C.navy})}${text(56,91,subtitle,{size:17,fill:C.muted})}<line x1="56" y1="112" x2="1544" y2="112" stroke="${C.blue}" stroke-width="3"/>`;
const finish = () => `</svg>`;

function systemContext() {
  let s=base("System context and decision boundary","External data and lender policy remain outside the model-serving trust boundary");
  s += rect(375,145,850,720,{fill:"#FAFBFC",stroke:C.blue,sw:3,rx:16,dash:"10 7"});
  s += text(405,180,"PLATFORM TRUST BOUNDARY",{size:15,weight:700,fill:C.blue});
  s += node(55,235,250,118,"Applicant / borrower","Authorizes data access; receives lender decision, notice, and reconsideration path",{fill:C.gray});
  s += node(55,445,250,118,"Data providers","Rent, utility, and cash-flow aggregates; source provenance and consent evidence",{fill:C.gray});
  s += node(1295,265,250,118,"Lender / LOS","Owns credit policy, final action, manual review, notices, and overrides",{fill:C.gray});
  s += node(1295,500,250,118,"Governance users","Model risk, fair lending, compliance, security, operations, and audit",{fill:C.gray});
  s += node(420,225,270,125,"API edge","Client identity, tenant authorization, schema and size limits, replay and rate controls",{fill:C.cyan,stroke:C.blue});
  s += node(775,225,270,125,"Decision service","Feature contract, approved model, threshold policy, reason-code mapper",{fill:C.cyan,stroke:C.blue});
  s += node(420,440,270,125,"Audit plane","Minimal event schema, tokenized IDs, model and policy versions, integrity seal",{fill:C.green,stroke:C.greenLine});
  s += node(775,440,270,125,"Monitoring plane","Outcome linkage, drift, calibration, subgroup metrics, alert evaluation",{fill:C.green,stroke:C.greenLine});
  s += node(595,675,270,125,"Model control plane","Training, validation, registry, approval record, signed artifact, rollback",{fill:C.purple,stroke:C.purpleLine});
  s += line(305,294,420,287,{stroke:C.blue}); s += text(320,276,"application data",{size:14,fill:C.muted});
  s += path("M305 504 H350 V335 H420",{stroke:C.blue}); s += text(316,485,"verified aggregates",{size:14,fill:C.muted});
  s += line(690,287,775,287,{stroke:C.blue}); s += line(1045,287,1295,324,{stroke:C.blue});
  s += text(1084,278,"score + recommendation + reasons",{size:14,fill:C.muted});
  s += path("M910 350 V405 H555 V440",{stroke:C.greenLine});
  s += path("M910 350 V405 H910 V440",{stroke:C.greenLine});
  s += path("M690 502 H775",{stroke:C.greenLine});
  s += path("M1045 502 H1180 V559 H1295",{stroke:C.greenLine}); s += text(1072,484,"alerts / reports",{size:14,fill:C.muted});
  s += path("M730 675 V620 H555 V565",{stroke:C.purpleLine});
  s += path("M730 675 V620 H910 V565",{stroke:C.purpleLine});
  s += path("M865 736 H1130 V360 H1045",{stroke:C.purpleLine,dash:"8 6"}); s += text(945,718,"approved artifact + policy",{size:14,fill:C.muted});
  s += tag(420,842,"prediction data excludes protected attributes",C.amber,C.amberLine);
  s += tag(800,842,"monitoring attributes separated and access-controlled",C.amber,C.amberLine);
  return s+finish();
}

function scoringSequence() {
  let s=base("Online scoring transaction","Synchronous decision path with version, audit, and failure invariants");
  const lanes=["Lender / LOS","API edge","Scoring service","Feature contract","Model + policy","Explainer","Audit writer"];
  const xs=[90,300,510,720,930,1140,1350];
  lanes.forEach((l,i)=>{s+=rect(xs[i]-75,145,150,48,{fill:i===0?C.gray:C.cyan,stroke:i===0?C.line:C.blue,rx:6});s+=text(xs[i],175,l,{size:15,weight:700,anchor:"middle"});s+=line(xs[i],193,xs[i],895,{stroke:C.line,sw:1,dash:"6 7",arrow:false});});
  const msg=(a,b,y,label,color=C.blue,dash="")=>{s+=line(xs[a],y,xs[b],y,{stroke:color,sw:2,dash});s+=text((xs[a]+xs[b])/2,y-8,label,{size:13,fill:C.ink,anchor:"middle"});};
  msg(0,1,235,"1  POST /v1/score + idempotency key");
  msg(1,2,285,"2  tenant identity + correlation ID");
  msg(2,3,335,"3  validate names, types, bounds");
  msg(3,2,385,"4  canonical vector + schema hash",C.greenLine);
  msg(2,4,435,"5  predict with approved artifact");
  msg(4,2,485,"6  score + artifact/policy versions",C.greenLine);
  msg(2,5,535,"7  rank local contributions");
  msg(5,2,585,"8  versioned reason codes",C.greenLine);
  msg(2,6,635,"9  write privacy-minimized event");
  msg(6,2,685,"10 durable audit event ID",C.greenLine);
  msg(2,1,735,"11 response: recommendation + evidence",C.greenLine);
  msg(1,0,785,"12 HTTP result + request ID",C.greenLine);
  s+=rect(365,825,870,92,{fill:C.red,stroke:C.redLine,sw:2,rx:8});
  s+=text(388,854,"Failure invariants",{size:17,weight:700,fill:C.redLine});
  s+=text(388,880,"Reject on unknown tenant, incompatible schema, unapproved artifact, non-finite value, or required audit failure.",{size:15});
  s+=text(388,902,"Never fall back to a different model or reuse a stale explanation without an explicit governed policy.",{size:15});
  return s+finish();
}

function deployment() {
  let s=base("Reference production deployment topology","Isolation between lender ingress, online inference, evidence storage, and offline model development");
  s+=rect(42,145,1516,760,{fill:"#FBFCFD",stroke:C.line,sw:2,rx:14});
  s+=text(65,176,"CLOUD / REGULATED WORKLOAD ACCOUNT",{size:15,weight:700,fill:C.muted});
  s+=rect(70,205,250,620,{fill:C.gray,stroke:C.line,rx:10});s+=text(95,237,"EDGE ZONE",{size:16,weight:700,fill:C.navy});
  s+=node(95,270,200,120,"API gateway","TLS or mTLS, OAuth client identity, rate limits, WAF, idempotency",{fill:C.white});
  s+=node(95,445,200,120,"Tenant authorizer","Institution, environment, role, product, endpoint scope",{fill:C.white});
  s+=node(95,620,200,120,"Request controls","Schema size, replay cache, correlation ID, safe error mapping",{fill:C.white});
  s+=rect(355,205,510,620,{fill:C.cyan,stroke:C.blue,rx:10});s+=text(380,237,"PRIVATE ONLINE SERVICE ZONE",{size:16,weight:700,fill:C.navy});
  s+=node(390,270,205,120,"Scoring replicas","Stateless containers; health probes; autoscaling; no local source data",{fill:C.white});
  s+=node(625,270,205,120,"Artifact loader","Digest and signature verification; schema compatibility; LKG cache",{fill:C.white});
  s+=node(390,445,205,120,"Explanation service","Linear contributions or approved method; reason dictionary version",{fill:C.white});
  s+=node(625,445,205,120,"Telemetry agent","Metrics and traces without raw features or direct identifiers",{fill:C.white});
  s+=node(505,620,210,120,"Durable audit queue","Back-pressure, deduplication, delivery acknowledgement, DLQ",{fill:C.white});
  s+=rect(900,205,300,620,{fill:C.green,stroke:C.greenLine,rx:10});s+=text(925,237,"EVIDENCE DATA ZONE",{size:16,weight:700,fill:C.navy});
  s+=node(935,270,230,120,"Model registry","Approval record, model/policy versions, artifact digest, feature hash",{fill:C.white});
  s+=node(935,445,230,120,"Immutable audit store","Append-only access, encryption, retention, seal verification",{fill:C.white});
  s+=node(935,620,230,120,"Monitoring warehouse","Tokenized outcomes, feature aggregates, group metrics, drift state",{fill:C.white});
  s+=rect(1235,205,290,620,{fill:C.purple,stroke:C.purpleLine,rx:10});s+=text(1260,237,"OFFLINE CONTROL ZONE",{size:16,weight:700,fill:C.navy});
  s+=node(1270,270,220,120,"Training jobs","Immutable snapshots, pinned image, reproducible config, no serving access",{fill:C.white});
  s+=node(1270,445,220,120,"Validation jobs","Performance, calibration, fairness, stability, explanation challenge",{fill:C.white});
  s+=node(1270,620,220,120,"Promotion workflow","Role-separated approval, signed artifact, canary, rollback pointer",{fill:C.white});
  s+=line(320,505,355,505,{stroke:C.blue});s+=line(595,330,625,330,{stroke:C.blue});
  s+=path("M830 330 H900",{stroke:C.greenLine});s+=path("M715 680 H900",{stroke:C.greenLine});
  s+=path("M1165 330 H1235",{stroke:C.purpleLine,dash:"7 5"});s+=path("M1235 680 H1200",{stroke:C.purpleLine,dash:"7 5"});
  s+=path("M1270 505 H1215 V330 H1165",{stroke:C.purpleLine});
  s+=tag(82,852,"no public model storage",C.amber,C.amberLine);s+=tag(420,852,"serving loads approved versions only",C.amber,C.amberLine);s+=tag(910,852,"audit and monitoring access separated",C.amber,C.amberLine);s+=tag(1260,852,"promotion requires dual control",C.amber,C.amberLine);
  return s+finish();
}

function lifecycle() {
  let s=base("Model lifecycle and approval gates","Every transition emits immutable evidence; failure returns the artifact to the responsible stage");
  const stages=[
    ["Data snapshot","provenance, consent, scope, label maturity",C.gray,C.line],
    ["Feature build","contract, transforms, leakage and proxy review",C.cyan,C.blue],
    ["Candidate train","baseline, challenger, convergence, reproducibility",C.cyan,C.blue],
    ["Evaluation","performance, calibration, stability, stress",C.green,C.greenLine],
    ["Fairness review","selection, errors, calibration, uncertainty",C.green,C.greenLine],
    ["Independent validation","conceptual soundness, implementation, outcomes",C.purple,C.purpleLine],
    ["Approval + registry","signed decision, digest, threshold, limitations",C.purple,C.purpleLine],
    ["Controlled serving","canary, monitoring, rollback, incidents",C.amber,C.amberLine]
  ];
  stages.forEach((st,i)=>{const row=i<4?0:1;const col=i%4;const x=65+col*380;const y=row===0?185:510;s+=node(x,y,310,125,`${i+1}. ${st[0]}`,st[1],{fill:st[2],stroke:st[3]});if(col<3)s+=line(x+310,y+63,x+380,y+63,{stroke:st[3]});});
  s+=path("M1545 248 V445 H65 V573",{stroke:C.line,sw:2});
  s+=rect(210,705,1180,150,{fill:C.red,stroke:C.redLine,sw:2,rx:10});
  s+=text(235,738,"Hard gates",{size:19,weight:700,fill:C.redLine});
  s+=text(235,770,"Data: lawful provenance and representative scope  |  Training: successful convergence and reproducibility",{size:16});
  s+=text(235,800,"Validation: resolved critical findings  |  Fairness: approved trade-offs and residual risk  |  Deployment: signed artifact",{size:16});
  s+=text(235,830,"Monitoring breach: freeze promotion, preserve evidence, assess harm, roll back or recalibrate under change control",{size:16});
  s+=path("M1385 635 H1490 V900 H180 V325 H65",{stroke:C.redLine,sw:2,dash:"8 6"});
  s+=tag(610,888,"feedback path: outcomes → monitoring → governed retraining",C.amber,C.amberLine);
  return s+finish();
}

function lineage() {
  let s=base("Data lineage, feature contract, and evidence linkage","Prediction data, monitoring attributes, and model-governance metadata follow separate controlled paths");
  const y=210;
  s+=node(55,y,220,120,"Permissioned sources","Provider record ID, source type, consent reference, coverage window, correction status",{fill:C.gray});
  s+=node(330,y,220,120,"Raw landing zone","Encrypted object, checksum, provider manifest, restricted access, retention class",{fill:C.gray});
  s+=node(605,y,220,120,"Validated snapshot","Schema result, row reconciliation, quality exceptions, immutable snapshot ID",{fill:C.cyan,stroke:C.blue});
  s+=node(880,y,220,120,"Feature pipeline","Versioned code, fitted transforms, missingness policy, ordered vector",{fill:C.cyan,stroke:C.blue});
  s+=node(1155,y,220,120,"Feature contract","Name, type, unit, range, lookback, source, reason mapping, schema hash",{fill:C.cyan,stroke:C.blue});
  s+=line(275,270,330,270);s+=line(550,270,605,270);s+=line(825,270,880,270);s+=line(1100,270,1155,270);
  s+=node(330,455,270,125,"Training matrix","Snapshot ID + split hash + feature hash + target definition; protected attributes excluded from predictors",{fill:C.green,stroke:C.greenLine});
  s+=node(690,455,270,125,"Sensitive monitoring enclave","Lawful protected or proxy attributes; tokenized join key; restricted analysts; aggregate release",{fill:C.amber,stroke:C.amberLine});
  s+=node(1050,455,270,125,"Outcome store","Tokenized application linkage; label definition and maturity; corrections and provenance",{fill:C.green,stroke:C.greenLine});
  s+=path("M715 330 V400 H465 V455",{stroke:C.greenLine});s+=path("M715 330 V400 H825 V455",{stroke:C.amberLine});s+=path("M1265 330 V400 H1185 V455",{stroke:C.greenLine});
  s+=node(165,690,270,125,"Model artifact","Serialized pipeline, dependency manifest, digest, signature, training configuration",{fill:C.purple,stroke:C.purpleLine});
  s+=node(530,690,270,125,"Registry record","Artifact digest, feature hash, threshold, reports, validation and approval references",{fill:C.purple,stroke:C.purpleLine});
  s+=node(895,690,270,125,"Decision audit event","Tokenized ID, request ID, model/policy versions, score, reasons, feature hash, integrity seal",{fill:C.purple,stroke:C.purpleLine});
  s+=node(1260,690,270,125,"Monitoring record","Joined outcomes and aggregate group metrics; uncertainty, drift state, trigger disposition",{fill:C.purple,stroke:C.purpleLine});
  s+=path("M465 580 V630 H300 V690",{stroke:C.purpleLine});s+=line(435,752,530,752,{stroke:C.purpleLine});s+=line(800,752,895,752,{stroke:C.purpleLine});s+=line(1165,752,1260,752,{stroke:C.purpleLine});
  s+=path("M825 580 V635 H1395 V690",{stroke:C.amberLine,dash:"8 6"});s+=path("M1185 580 V635 H1395 V690",{stroke:C.greenLine});
  s+=tag(70,875,"join keys are tokenized; direct identifiers are excluded from analytical stores",C.amber,C.amberLine);
  s+=tag(790,875,"schema hash prevents training-serving skew",C.green,C.greenLine);
  return s+finish();
}

function fairnessLoop() {
  let s=base("Fairness monitoring and mitigation control loop","Metric computation is subordinate to data quality, statistical uncertainty, legal review, and operational action");
  const nodes=[
    [70,210,"1. Cohort assembly","Product, population, decision policy, observation horizon, label maturity, exclusions",C.gray,C.line],
    [410,210,"2. Data checks","Group counts, missingness, provider coverage, token linkage, small-cell suppression",C.cyan,C.blue],
    [750,210,"3. Metric engine","Selection rate, TPR/FPR, PPV/NPV, calibration, AUC, reason and override rates",C.green,C.greenLine],
    [1090,210,"4. Statistical layer","Confidence intervals, bootstrap, practical effect, multiple testing, stability flag",C.green,C.greenLine],
    [1090,500,"5. Trigger evaluation","Approved control bands, 0.80 ratio as screen only, drift and explanation alarms",C.amber,C.amberLine],
    [750,500,"6. Root-cause analysis","Data coverage, proxies, labels, model fit, threshold policy, human overrides",C.amber,C.amberLine],
    [410,500,"7. Mitigation experiment","Data repair, feature refinement, constraints, recalibration, deferral, process change",C.purple,C.purpleLine],
    [70,500,"8. Governance decision","Approve, condition, reject, roll back, collect evidence; record owner and residual risk",C.purple,C.purpleLine]
  ];
  nodes.forEach(n=>s+=node(n[0],n[1],285,130,n[2],n[3],{fill:n[4],stroke:n[5]}));
  s+=line(355,275,410,275,{stroke:C.blue});s+=line(695,275,750,275,{stroke:C.greenLine});s+=line(1035,275,1090,275,{stroke:C.greenLine});
  s+=line(1232,340,1232,500,{stroke:C.amberLine});s+=line(1090,565,1035,565,{stroke:C.amberLine});s+=line(750,565,695,565,{stroke:C.purpleLine});s+=line(410,565,355,565,{stroke:C.purpleLine});
  s+=path("M212 500 V425 H212 V340",{stroke:C.purpleLine,dash:"8 6"});
  s+=rect(170,725,1260,135,{fill:C.red,stroke:C.redLine,sw:2,rx:10});
  s+=text(195,758,"Release rule",{size:19,weight:700,fill:C.redLine});
  s+=text(195,790,"No model advances on a favorable point estimate alone. Review denominators, uncertainty, intersections, calibration,",{size:16});
  s+=text(195,818,"explanation fidelity, operational overrides, and legal constraints. Every mitigation is re-tested for performance and stability.",{size:16});
  s+=tag(550,890,"continuous path: outcomes and complaints re-enter cohort assembly",C.amber,C.amberLine);
  return s+finish();
}

function implementationMap() {
  let s=base("Current implementation map","Repository-level view of the active demonstration path and the two alternate implementation families");
  s+=rect(45,145,1510,735,{fill:"#FBFCFD",stroke:C.line,sw:2,rx:14});
  s+=node(75,190,300,165,"React operator console","App orchestration, contract-driven form, scoring, explanation, fairness, portfolio, outcomes, governance, audit explorer",{fill:C.cyan,stroke:C.blue});
  s+=node(470,190,300,165,"services/api","Principal documented FastAPI path: nine routes, API-key dependency, privacy validation, JSONL/SQLite audit",{fill:C.green,stroke:C.greenLine});
  s+=node(865,190,300,165,"src/ice","Core contract, model abstraction, logistic-regression bundle, training, reasons, fairness metrics, audit primitives",{fill:C.green,stroke:C.greenLine});
  s+=node(1260,190,250,165,"artifacts","Synthetic data, model bundle, registry JSON, report JSON, JSONL and optional SQLite evidence",{fill:C.purple,stroke:C.purpleLine});
  s+=line(375,272,470,272,{stroke:C.blue});s+=line(770,272,865,272,{stroke:C.greenLine});s+=line(1165,272,1260,272,{stroke:C.purpleLine});
  s+=tag(165,375,"active frontend integration",C.cyan,C.blue);s+=tag(555,375,"principal dossier path",C.green,C.greenLine);s+=tag(955,375,"shared core",C.green,C.greenLine);
  s+=node(120,470,385,145,"src/flg alternate family","Strict eight-feature vector; scaled logistic regression; approve/review/deny thresholds; coefficient reason records; per-file JSONL audit",{fill:C.amber,stroke:C.amberLine});
  s+=node(610,470,385,145,"src/mie_credit_platform alternate family","Typed eight-feature schema; CLI and API; approval-aware registry; SQLite/JSONL audit with configurable redaction",{fill:C.amber,stroke:C.amberLine});
  s+=node(1100,470,360,145,"Shared repository tests","Main-path end-to-end, governance, privacy and fairness tests plus an FLG smoke test; one unresolved governance expectation",{fill:C.gray,stroke:C.line});
  s+=path("M312 470 V430 H620 V355",{stroke:C.amberLine,dash:"8 6"});
  s+=path("M802 470 V430 H1015 V355",{stroke:C.amberLine,dash:"8 6"});
  s+=line(995,542,1100,542,{stroke:C.line});
  s+=rect(130,690,1340,125,{fill:C.red,stroke:C.redLine,sw:2,rx:10});
  s+=text(155,722,"Canonicalization requirement",{size:19,weight:700,fill:C.redLine});
  s+=text(155,753,"The three Python families use different feature names, lookback windows, decision states, schemas, registries, and audit formats.",{size:16});
  s+=text(155,782,"Production work must select one contract, migrate retained behavior under tests, and retire the other public serving paths.",{size:16});
  s+=tag(475,842,"dashed lines indicate conceptual overlap, not runtime calls",C.gray,C.line);
  return s+finish();
}

function featurePipeline() {
  let s=base("Feature contract and scoring pipeline","Current main-path behavior from typed request through decision, explanation, and audit evidence");
  const stages=[
    [55,190,220,"Request schema","pseudonymous application_id; numeric feature map; optional monitoring attributes",C.gray,C.line],
    [315,190,220,"Contract validation","required names; unknown-name rejection; numeric type check; fixed column order",C.cyan,C.blue],
    [575,190,220,"Sanitization","clamp two payment rates; prevent negative NSF and overdraft counts",C.cyan,C.blue],
    [835,190,220,"Vectorization","required then optional columns; missing optional values become 0.0; float array",C.cyan,C.blue],
    [1095,190,220,"Model inference","approved-current registry pointer or fallback path; logistic probability",C.green,C.greenLine],
    [1355,190,190,"Policy","threshold comparison; approve or deny",C.green,C.greenLine]
  ];
  stages.forEach((n,i)=>{s+=node(n[0],n[1],n[2],145,`${i+1}. ${n[3]}`,n[4],{fill:n[5],stroke:n[6]});if(i<stages.length-1)s+=line(n[0]+n[2],262,stages[i+1][0],262,{stroke:i<4?C.blue:C.greenLine});});
  s+=node(190,500,310,135,"Reason-code path","Seven heuristic conditions rank up to four codes by threshold distance; optional tenure fields have no heuristic code",{fill:C.amber,stroke:C.amberLine});
  s+=node(645,500,310,135,"Contribution path","Linear proxy returns coefficient multiplied by raw ordered feature value; base value is not returned",{fill:C.amber,stroke:C.amberLine});
  s+=node(1100,500,310,160,"Decision-event path","Tokenized application reference, request and model versions, score, threshold, reasons, feature hash; raw values off by default",{fill:C.purple,stroke:C.purpleLine});
  s+=path("M1450 335 V425 H345 V500",{stroke:C.amberLine});
  s+=path("M1190 335 V420 H800 V500",{stroke:C.amberLine});
  s+=path("M1450 335 V445 H1255 V500",{stroke:C.purpleLine});
  s+=rect(180,720,1240,130,{fill:C.red,stroke:C.redLine,sw:2,rx:10});
  s+=text(205,752,"Current boundary conditions",{size:19,weight:700,fill:C.redLine});
  s+=text(205,782,"Published UI minima and maxima are descriptive metadata; the main backend does not reject every out-of-range value.",{size:16});
  s+=text(205,810,"Reason codes and coefficient proxies require separate fidelity validation before borrower-notice or adverse-action use.",{size:16});
  s+=tag(505,884,"protected attributes are excluded from the model vector",C.green,C.greenLine);
  return s+finish();
}

function apiEventTopology() {
  let s=base("API surface and audit-event topology","Principal services/api routes, core handlers, emitted evidence, and read-side dependencies");
  s+=rect(60,155,270,725,{fill:C.cyan,stroke:C.blue,rx:12});s+=text(85,187,"HTTP SURFACE",{size:16,weight:700,fill:C.navy});
  const routes=["GET /health","GET /v1/models/current","GET /v1/features/contract","POST /v1/score","POST /v1/explain","POST /v1/portfolio/analyze","POST /v1/audit/fairness","POST /v1/audit/events","GET /v1/audit/events","GET /v1/governance/summary"];
  routes.forEach((r,i)=>{const y=210+i*61;s+=rect(82,y,226,48,{fill:C.white,stroke:i===0?C.line:C.blue,sw:2,rx:8});s+=text(98,y+30,r,{size:14.5,weight:700,fill:C.navy});});
  s+=rect(385,155,390,725,{fill:C.green,stroke:C.greenLine,rx:12});s+=text(410,187,"APPLICATION SERVICES",{size:16,weight:700,fill:C.navy});
  s+=node(420,220,320,100,"ModelStore + registry","Resolve current entry, fall back to configured model path, load joblib bundle",{fill:C.white});
  s+=node(420,355,320,100,"Scoring + explanation","Sanitize, vectorize, predict, threshold, heuristic reasons, linear contributions",{fill:C.white});
  s+=node(420,490,320,100,"Portfolio + fairness","Cohort scoring, bands, reason counts, group rates, parity and opportunity gaps",{fill:C.white});
  s+=node(420,625,320,100,"Privacy + governance","Pseudonymous ID validation, optional hashing, coverage controls, readiness state",{fill:C.white});
  s+=rect(830,155,310,725,{fill:C.purple,stroke:C.purpleLine,rx:12});s+=text(855,187,"WRITE-SIDE EVENTS",{size:16,weight:700,fill:C.navy});
  const ev=[
    ["decision","score, decision, threshold, reasons, feature hash"],
    ["explain","score, reason list, contribution count"],
    ["portfolio_analysis","count, score and decision aggregates, group key"],
    ["fairness_report","groups, counts and two difference metrics"],
    ["outcome","repayment window, binary observed result"]
  ];
  ev.forEach((e,i)=>s+=node(865,220+i*123,240,105,e[0],e[1],{fill:C.white,stroke:C.purpleLine}));
  s+=rect(1195,155,350,725,{fill:C.gray,stroke:C.line,rx:12});s+=text(1220,187,"PERSISTENCE + READ SIDE",{size:16,weight:700,fill:C.navy});
  s+=node(1230,235,280,110,"JSONL event stream","Append current events; list, filter, normalize, sort, paginate",{fill:C.white});
  s+=node(1230,400,280,110,"Optional SQLite mirror","Decision and outcome tables only in the main path",{fill:C.white});
  s+=node(1230,565,280,110,"Audit explorer","Reads normalized events by type or application reference",{fill:C.white});
  s+=node(1230,730,280,105,"Governance summary","Reads up to 250 events; derives coverage and threshold status",{fill:C.white});
  s+=line(330,505,385,505,{stroke:C.blue});s+=line(775,505,830,505,{stroke:C.purpleLine});s+=line(1140,505,1195,505,{stroke:C.purpleLine});
  s+=tag(475,900,"health is outside the v1 API-key dependency",C.amber,C.amberLine);
  s+=tag(975,900,"outcome writes are not idempotent",C.red,C.redLine);
  return s+finish();
}

function frontendFlow() {
  let s=base("Frontend component and state flow","React console composition, query ownership, write actions, and mock/live adapter boundary");
  s+=node(55,170,260,125,"App.tsx state owner","score, explanation, fairness, portfolio, error, loading flags, audit filters",{fill:C.cyan,stroke:C.blue});
  s+=node(370,170,260,125,"React Query read model","health, model info, feature contract, audit events, governance summary",{fill:C.cyan,stroke:C.blue});
  s+=node(685,170,260,125,"Typed API adapter","same TypeScript response shapes; fetch in live mode; fixtures and generated fields in mock mode",{fill:C.green,stroke:C.greenLine});
  s+=node(1000,170,250,125,"FastAPI live path","HTTP JSON contracts, API key, persisted audit events",{fill:C.green,stroke:C.greenLine});
  s+=node(1305,170,240,125,"Mock data path","fixed model, contract, fairness, portfolio, audit and governance fixtures",{fill:C.amber,stroke:C.amberLine});
  s+=line(315,232,370,232,{stroke:C.blue});s+=line(630,232,685,232,{stroke:C.greenLine});s+=line(945,215,1000,215,{stroke:C.greenLine});s+=line(945,260,1305,260,{stroke:C.amberLine});
  const comps=[
    [60,430,"Hero + Navbar","mode, health, active model, contract count, threshold, section navigation"],
    [350,430,"ScoreForm","contract groups, applicant reference, nine features, monitoring attributes, score/explain actions"],
    [640,430,"Metrics + Borrower","decision, score, reasons, rights, reconsideration and factor explanations"],
    [930,430,"Explain + Fairness","contribution bars, synthetic cohort, group rates and report action"],
    [1220,430,"Portfolio","cohort generation, group key, aggregate summary, reason frequency, row preview"]
  ];
  comps.forEach(c=>s+=node(c[0],c[1],260,135,c[2],c[3],{fill:C.white,stroke:C.line}));
  s+=node(205,675,300,125,"OutcomeTracker","links a scored application to one of four binary repayment windows; triggers audit and governance refetch",{fill:C.white,stroke:C.line});
  s+=node(650,675,300,125,"GovernanceCenter","control register, decision lineage and monitoring tabs; live summary plus design fixtures",{fill:C.white,stroke:C.line});
  s+=node(1095,675,300,125,"AuditTable","event-type and application filters; total count; normalized payload inspection",{fill:C.white,stroke:C.line});
  s+=path("M185 430 V350 H185 V295",{stroke:C.blue});s+=path("M480 430 V350 H240 V295",{stroke:C.blue});
  s+=path("M770 430 V350 H240 V295",{stroke:C.blue});s+=path("M1060 430 V350 H505 V295",{stroke:C.blue});s+=path("M1350 430 V350 H505 V295",{stroke:C.blue});
  s+=path("M355 675 V635 H240 V295",{stroke:C.blue});s+=path("M800 675 V635 H505 V295",{stroke:C.blue});s+=path("M1245 675 V635 H505 V295",{stroke:C.blue});
  s+=tag(315,875,"mock outcome returns ok but does not persist",C.red,C.redLine);
  s+=tag(830,875,"mock score and decision are runtime-generated",C.amber,C.amberLine);
  return s+finish();
}

function privacyAuditFlow() {
  let s=base("Privacy minimization and audit flow","Current controls for applicant references, feature evidence, monitoring attributes, and operator reads");
  s+=node(55,185,260,125,"Client payload","pseudonymous application reference; scored features; optional sensitive monitoring context",{fill:C.gray});
  s+=node(370,185,260,125,"Reference validator","allowlisted characters and length; reject email, telephone, government-ID and whitespace patterns",{fill:C.cyan,stroke:C.blue});
  s+=node(685,185,260,125,"Audit identifier policy","SHA-256 with optional deployment salt; ref_ prefix; hashing enabled by default",{fill:C.green,stroke:C.greenLine});
  s+=node(1000,185,260,125,"Decision event minimizer","feature hash always; raw features disabled by default; sensitive context disabled by default",{fill:C.green,stroke:C.greenLine});
  s+=node(1315,185,230,125,"Storage","JSONL append; optional SQLite decision and outcome mirror",{fill:C.purple,stroke:C.purpleLine});
  s+=line(315,247,370,247,{stroke:C.blue});s+=line(630,247,685,247,{stroke:C.greenLine});s+=line(945,247,1000,247,{stroke:C.greenLine});s+=line(1260,247,1315,247,{stroke:C.purpleLine});
  s+=node(135,455,300,160,"Scoring response","Returns the submitted pseudonymous reference, request ID, model/schema versions, decision evidence; client handles display",{fill:C.cyan,stroke:C.blue});
  s+=node(540,455,300,160,"Audit read API","Filters application reference through the same hashing policy before matching stored events",{fill:C.cyan,stroke:C.blue});
  s+=node(945,455,300,160,"Outcome linkage","Uses the same tokenized reference so later outcomes can be joined without storing the source reference",{fill:C.green,stroke:C.greenLine});
  s+=path("M500 310 V400 H285 V455",{stroke:C.blue});s+=path("M800 310 V400 H690 V455",{stroke:C.blue});s+=path("M800 310 V400 H1095 V455",{stroke:C.greenLine});
  s+=rect(185,720,1230,130,{fill:C.red,stroke:C.redLine,sw:2,rx:10});
  s+=text(210,752,"Production controls still required",{size:19,weight:700,fill:C.redLine});
  s+=text(210,782,"Secret-managed nonempty salt, tenant-scoped tokens, encryption and key rotation, immutable storage, retention and deletion policy,",{size:16});
  s+=text(210,810,"purpose-based access, export controls, breach monitoring, correction workflow, and proof that raw request bodies are absent from telemetry.",{size:16});
  s+=tag(540,884,"a pseudonymous reference is still linkable data",C.amber,C.amberLine);
  return s+finish();
}

function failureStateMachine() {
  let s=base("Serving failure and recovery state machine","Fail-closed target behavior for request, model, explanation, audit, and monitoring dependencies");
  const n=(x,y,title,detail,fill,stroke)=>{s+=node(x,y,270,115,title,detail,{fill,stroke});};
  n(70,185,"Receive request","assign correlation ID; authenticate; enforce request and tenant policy",C.cyan,C.blue);
  n(410,185,"Validate contract","pseudonymous reference, required names, types, bounds and schema compatibility",C.cyan,C.blue);
  n(750,185,"Load governed artifact","approved current pointer, digest/signature, feature hash, threshold policy",C.purple,C.purpleLine);
  n(1090,185,"Compute decision","finite score, explicit policy state, stable reasons and version evidence",C.green,C.greenLine);
  n(1260,430,"Commit audit evidence","durable acknowledgement before a consequential result leaves the boundary",C.green,C.greenLine);
  n(870,430,"Return response","decision support result plus correlation, model, schema, policy and reason versions",C.green,C.greenLine);
  n(480,430,"Degraded review path","only under an approved lender policy; never substitute another model silently",C.amber,C.amberLine);
  n(90,430,"Reject safely","bounded status, safe message, correlation ID; no raw values or internal path",C.red,C.redLine);
  s+=line(340,242,410,242,{stroke:C.blue});s+=line(680,242,750,242,{stroke:C.purpleLine});s+=line(1020,242,1090,242,{stroke:C.greenLine});
  s+=path("M1225 300 V360 H1395 V430",{stroke:C.greenLine});s+=line(1260,487,1140,487,{stroke:C.greenLine});
  s+=path("M410 300 V370 H225 V430",{stroke:C.redLine,dash:"7 5"});s+=path("M750 300 V370 H225 V430",{stroke:C.redLine,dash:"7 5"});
  s+=path("M1090 300 V370 H615 V430",{stroke:C.amberLine,dash:"7 5"});s+=path("M1260 545 V650 H225 V545",{stroke:C.redLine,dash:"7 5"});
  s+=rect(160,700,1280,150,{fill:C.gray,stroke:C.line,sw:2,rx:10});
  s+=text(185,733,"Implementation status",{size:19,weight:700,fill:C.navy});
  s+=text(185,765,"Current code returns 400 for core contract errors and 503 when the model artifact is missing. API-key auth is optional.",{size:16});
  s+=text(185,795,"Idempotency, rate limits, tenant authorization, signature verification, durable audit acknowledgement, circuit breakers, and review-mode policy remain target controls.",{size:16});
  s+=tag(550,886,"no silent model fallback",C.red,C.redLine);s+=tag(825,886,"no unaudited consequential response",C.red,C.redLine);
  return s+finish();
}

const diagrams = {
  "system-context": systemContext(),
  "online-scoring-sequence": scoringSequence(),
  "production-deployment-topology": deployment(),
  "model-lifecycle-governance": lifecycle(),
  "data-lineage-evidence": lineage(),
  "fairness-control-loop": fairnessLoop(),
  "current-implementation-map": implementationMap(),
  "feature-scoring-pipeline": featurePipeline(),
  "api-event-topology": apiEventTopology(),
  "frontend-state-flow": frontendFlow(),
  "privacy-audit-flow": privacyAuditFlow(),
  "failure-recovery-state-machine": failureStateMachine()
};

for (const [name, svg] of Object.entries(diagrams)) {
  await writeFile(join(OUT, `${name}.svg`), svg, "utf8");
  await sharp(Buffer.from(svg)).resize({width: 1800}).png({quality: 95}).toFile(join(OUT, `${name}.png`));
  process.stdout.write(`${name}\n`);
}
