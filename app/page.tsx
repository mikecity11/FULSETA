"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, CircleDollarSign, ExternalLink,
  FileCheck2, Github, Globe2, Loader2, LockKeyhole, ShieldCheck, Sparkles,
  WalletCards, WandSparkles
} from "lucide-react";
import {
  CONTRACT_ADDRESS, DEMO_MODE, connectWallet, createAgreement, evaluateWork,
  fundAgreement, readAgreement, submitEvidence
} from "@/lib/genlayer";

type Toast = { kind: "ok" | "err"; text: string } | null;

const shorten = (x: string) => x ? `${x.slice(0, 6)}…${x.slice(-4)}` : "";

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [tab, setTab] = useState<"create"|"verify">("create");

  const [dealId, setDealId] = useState("creator-001");
  const [worker, setWorker] = useState("");
  const [task, setTask] = useState("Publish a public YouTube review of the client's product.");
  const [requirements, setRequirements] = useState("Video must be at least 5 minutes, mention GenLayer, explain Intelligent Contracts, and remain publicly accessible.");
  const [deadline, setDeadline] = useState("2026-09-15");
  const [amount, setAmount] = useState("10");
  const [evidence, setEvidence] = useState("");
  const [lookupId, setLookupId] = useState("creator-001");
  const [agreement, setAgreement] = useState<any>(null);

  const networkLabel = CONTRACT_ADDRESS ? "GenLayer Bradbury Testnet" : "Demo Mode";

  async function run(label: string, fn: () => Promise<any>, success: string) {
    try {
      setBusy(label); setToast(null);
      const out = await fn();
      setToast({ kind: "ok", text: success });
      return out;
    } catch (e:any) {
      setToast({ kind: "err", text: e?.message || "Something went wrong." });
    } finally { setBusy(""); }
  }

  async function onConnect() {
  if (!CONTRACT_ADDRESS && DEMO_MODE) {
    setWallet("0x8713b5d277CA1c0eA9f31A23DD4f1eE5");
    setToast({ kind: "ok", text: "Demo wallet connected. Add the contract address to enable real GenLayer writes." });
    return;
  }

  const result = await run(
    "connect",
    connectWallet,
    "Wallet connected to GenLayer Bradbury Testnet."
  );

  if (result?.account) setWallet(result.account);
}

  async function demoCreate() {
    if (!worker) return setToast({kind:"err", text:"Add the worker wallet address."});
    if (!wallet) await onConnect();
    if (!CONTRACT_ADDRESS && DEMO_MODE) {
      const mock = { exists:true, deal_id:dealId, client:wallet || "0xClient", worker, task, requirements, deadline, evidence_url:"", status:"FUNDED", verdict:"", reasoning:"", amount_wei:String(Number(amount)*1e18) };
      localStorage.setItem(`fulseta:${dealId}`, JSON.stringify(mock));
      setAgreement(mock);
      setToast({kind:"ok", text:"Demo agreement created and funded."});
      setTab("verify");
      setLookupId(dealId);
      return;
    }
    const c = await run("create", () => createAgreement(dealId, worker, task, requirements, deadline), "Agreement created on GenLayer.");
    if (!c) return;
    const f = await run("fund", () => fundAgreement(dealId, amount), `Agreement funded with ${amount} GEN.`);
    if (f) { setLookupId(dealId); setTab("verify"); }
  }

  async function loadAgreement() {
    if (!CONTRACT_ADDRESS && DEMO_MODE) {
      const raw = localStorage.getItem(`fulseta:${lookupId}`);
      if (!raw) return setToast({kind:"err", text:"No demo agreement found with that ID."});
      setAgreement(JSON.parse(raw)); return;
    }
    const a = await run("load", () => readAgreement(lookupId), "Agreement loaded.");
    if (a) setAgreement(a);
  }

  async function submit() {
    if (!agreement) return;
    if (!CONTRACT_ADDRESS && DEMO_MODE) {
      const next = {...agreement, evidence_url:evidence, status:"EVIDENCE_SUBMITTED"};
      localStorage.setItem(`fulseta:${lookupId}`, JSON.stringify(next));
      setAgreement(next);
      setToast({kind:"ok", text:"Demo evidence submitted."});
      return;
    }
    const out = await run("evidence", () => submitEvidence(lookupId, evidence), "Evidence submitted for consensus review.");
    if (out) await loadAgreement();
  }

  async function judge() {
    if (!agreement) return;
    if (!CONTRACT_ADDRESS && DEMO_MODE) {
      setBusy("judge");
      await new Promise(r => setTimeout(r, 1400));
      const next = {...agreement, status:"COMPLETED", verdict:"PASS", reasoning:"The submitted public evidence is accessible and, for this demo, is treated as satisfying the material delivery requirements. On GenLayer, validators independently fetch and judge the evidence before reaching consensus."};
      localStorage.setItem(`fulseta:${lookupId}`, JSON.stringify(next));
      setAgreement(next); setBusy("");
      setToast({kind:"ok", text:"Demo verdict: PASS. Real mode uses GenLayer validator consensus."});
      return;
    }
    const out = await run("judge", () => evaluateWork(lookupId), "GenLayer reached a verdict.");
    if (out) await loadAgreement();
  }

  const statusClass = useMemo(() => {
    const s = agreement?.status || "";
    if (s === "COMPLETED") return "status pass";
    if (s === "FAILED") return "status fail";
    return "status";
  }, [agreement]);

  <main>
  <nav className="nav shell premiumNav">
    <a className="brand" href="#">
      <img
        className="logoImg"
        src="/fulseta-logo.svg"
        alt="Fulseta"
      />
      <span>FULSETA</span>
    </a>

    <div className="navLinks">
      <a href="#how">How it works</a>
      <a href="#usecases">Use cases</a>
      <a href="#app">Product</a>
    </div>

    <div className="navRight">
      <span className="network">
        <i />
        {networkLabel}
      </span>

      <button className="btn walletBtn" onClick={connect}>
        <WalletCards size={17} />
        {wallet ? shorten(wallet) : "Connect wallet"}
      </button>
    </div>
  </nav>

  <section className="premiumHero">
    <div className="heroGlow heroGlowOne" />
    <div className="heroGlow heroGlowTwo" />
    <div className="heroRibbon heroRibbonOne" />
    <div className="heroRibbon heroRibbonTwo" />

    <div className="shell premiumHeroGrid">
      <div className="premiumHeroCopy">
        <div className="eyebrow">
          <Sparkles size={15} />
          Powered by GenLayer validator consensus
        </div>

        <h1>
          Verified work.
          <span>Automatic payment.</span>
        </h1>

        <p className="lead">
          Fulseta turns plain-English work agreements into outcome-based
          escrow. Submit proof, let GenLayer validators judge it, and release
          payment when the job is done.
        </p>

        <div className="heroActions">
          <button
            className="btn primary heroPrimary"
            onClick={() => {
              setTab("create");
              document
                .getElementById("app")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Create an agreement
            <ArrowRight size={17} />
          </button>

          <a className="btn heroSecondary" href="#how">
            How it works
          </a>
        </div>

        <div className="trustRow">
          <span>
            <ShieldCheck size={18} />
            Consensus verified
          </span>

          <span>
            <LockKeyhole size={18} />
            Escrow protected
          </span>

          <span>
            <Globe2 size={18} />
            Proof from the open web
          </span>
        </div>
      </div>

      <div className="heroProduct">
        <div className="proofToast">
          <div className="proofIcon">
            <BadgeCheck size={22} />
          </div>

          <div>
            <strong>Proof verified</strong>
            <span>Validator consensus reached</span>
          </div>

          <ArrowRight size={17} />
        </div>

        <div className="agreementPreview">
          <div className="previewHeader">
            <div>
              <span className="previewLabel">LIVE AGREEMENT</span>
              <h3>Website design</h3>
              <small>fulseta-demo-001</small>
            </div>

            <span className="previewStatus">
              In progress
            </span>
          </div>

          <div className="timeline">
            <div className="timelineItem complete">
              <span className="timelineDot">
                <FileCheck2 size={15} />
              </span>

              <div>
                <strong>Agreement created</strong>
                <small>Terms recorded on GenLayer</small>
              </div>
            </div>

            <div className="timelineLine active" />

            <div className="timelineItem active">
              <span className="timelineDot">
                <ExternalLink size={14} />
              </span>

              <div>
                <strong>Proof submitted</strong>
                <small>Public evidence received</small>
              </div>
            </div>

            <div className="timelineLine" />

            <div className="timelineItem">
              <span className="timelineDot" />

              <div>
                <strong>Validator review</strong>
                <small>GenLayer consensus</small>
              </div>
            </div>

            <div className="timelineLine" />

            <div className="timelineItem">
              <span className="timelineDot" />

              <div>
                <strong>Payment released</strong>
                <small>Automatically settled</small>
              </div>
            </div>
          </div>

          <div className="previewFooter">
            <span>Protected by Fulseta</span>
            <span>View agreement <ArrowRight size={14} /></span>
          </div>
        </div>

        <div className="escrowFloat">
          <div className="escrowIcon">
            <LockKeyhole size={19} />
          </div>

          <span>Payment secured</span>
          <strong>0.50 GEN</strong>
          <small>Held in escrow</small>
        </div>
      </div>
    </div>

    <div className="shell heroBottom">
      <span>Built for internet-native work</span>

      <div>
        <span>Creators</span>
        <span>Freelancers</span>
        <span>DAOs</span>
        <span>AI agents</span>
      </div>

      <span>
        <Globe2 size={17} />
        Open, verifiable and global
      </span>
    </div>
  </section>

      <section id="app" className="appShell shell">
        <div className="tabs">
          <button className={tab==="create"?"active":""} onClick={()=>setTab("create")}>Create deal</button>
          <button className={tab==="verify"?"active":""} onClick={()=>setTab("verify")}>Verify & settle</button>
        </div>

        {toast && <div className={`toast ${toast.kind}`}>{toast.text}</div>}

        {tab === "create" ? (
          <div className="panel">
            <div className="panelHead">
              <div><span className="kicker">NEW AGREEMENT</span><h2>Define the outcome</h2><p>Write the deal in plain English. Fulseta turns it into verifiable settlement conditions.</p></div>
              <FileCheck2 size={34}/>
            </div>

            <div className="formGrid">
              <label><span>Deal ID</span><input value={dealId} onChange={e=>setDealId(e.target.value)} placeholder="creator-001"/></label>
              <label><span>Worker wallet</span><input value={worker} onChange={e=>setWorker(e.target.value)} placeholder="0x..."/></label>
              <label className="wide"><span>Task</span><textarea value={task} onChange={e=>setTask(e.target.value)} rows={3}/></label>
              <label className="wide"><span>Success requirements</span><textarea value={requirements} onChange={e=>setRequirements(e.target.value)} rows={4}/></label>
              <label><span>Deadline</span><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
              <label><span>Escrow amount (GEN)</span><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></label>
            </div>
            <button className="btn primary full" disabled={!!busy} onClick={demoCreate}>
              {busy ? <Loader2 className="spin" size={17}/> : <LockKeyhole size={17}/>}
              Create & fund agreement
            </button>
          </div>
        ) : (
          <div className="panel">
            <div className="lookup">
              <input value={lookupId} onChange={e=>setLookupId(e.target.value)} placeholder="Enter deal ID"/>
              <button className="btn ghost" disabled={!!busy} onClick={loadAgreement}>{busy==="load"?<Loader2 className="spin" size={17}/>:"Load agreement"}</button>
            </div>

            {!agreement ? <div className="empty"><BadgeCheck size={42}/><h3>Load an agreement</h3><p>Review its requirements, submit public evidence, then ask GenLayer validators for a verdict.</p></div> :
            <div className="deal">
              <div className="dealTop">
                <div><span className="kicker">AGREEMENT {agreement.deal_id}</span><h2>{agreement.task}</h2></div>
                <span className={statusClass}>{agreement.status?.replaceAll("_"," ")}</span>
              </div>
              <div className="meta">
                <div><small>Worker</small><b>{shorten(agreement.worker)}</b></div>
                <div><small>Deadline</small><b>{agreement.deadline}</b></div>
                <div><small>Escrow</small><b>{agreement.amount_wei ? `${(Number(agreement.amount_wei)/1e18).toFixed(2)} GEN` : "—"}</b></div>
              </div>
              <div className="requirements"><small>SUCCESS REQUIREMENTS</small><p>{agreement.requirements}</p></div>

              {!agreement.evidence_url && <div className="evidence">
                <input value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="https://youtube.com/... or any public evidence URL"/>
                <button className="btn primary" onClick={submit} disabled={!!busy}>{busy==="evidence"?<Loader2 className="spin" size={17}/>:<ExternalLink size={17}/>}Submit proof</button>
              </div>}

              {agreement.evidence_url && !["COMPLETED","FAILED"].includes(agreement.status) && <div className="judgeBox">
                <div><WandSparkles/><div><b>Evidence ready for judgment</b><p>{agreement.evidence_url}</p></div></div>
                <button className="btn primary" onClick={judge} disabled={!!busy}>{busy==="judge"?<><Loader2 className="spin" size={17}/>Validators judging…</>:<>Run consensus <ArrowRight size={17}/></>}</button>
              </div>}

              {agreement.verdict && <div className={`verdict ${agreement.verdict==="PASS"?"pass":"fail"}`}>
                <BadgeCheck size={28}/><div><small>GENLAYER VERDICT</small><h3>{agreement.verdict}</h3><p>{agreement.reasoning}</p></div>
              </div>}
            </div>}
          </div>
        )}
      </section>

      <section id="how" className="how shell">
        <span className="kicker">HOW IT WORKS</span>
        <h2>From promise to payment in four steps.</h2>
        <div className="steps">
          <article><span>01</span><BriefcaseBusiness/><h3>Define the job</h3><p>Client sets the task, deadline and measurable success conditions.</p></article>
          <article><span>02</span><CircleDollarSign/><h3>Lock the escrow</h3><p>GEN is held by the Intelligent Contract until the outcome is known.</p></article>
          <article><span>03</span><Globe2/><h3>Submit proof</h3><p>The worker submits a public URL showing the finished work.</p></article>
          <article><span>04</span><ShieldCheck/><h3>Consensus settles</h3><p>Validators independently fetch and judge the evidence. PASS releases payment.</p></article>
        </div>
      </section>

      <section className="usecases shell">
        <div><span className="kicker">START WITH CREATORS. EXPAND EVERYWHERE.</span><h2>One settlement layer for internet work.</h2></div>
        <div className="caseGrid">
          <div><b>Creator deals</b><p>Pay when sponsored content satisfies the brief.</p></div>
          <div><b>Developer bounties</b><p>Release rewards when submitted work meets acceptance criteria.</p></div>
          <div><b>AI agent work</b><p>Agents can hire, verify and pay other agents for provable outcomes.</p></div>
        </div>
      </section>

      <footer className="shell footer"><a className="brand" href="#"><img className="logoImg" src="/fulseta-logo.svg" alt="Fulseta"/><span>FULSETA</span></a><span>Built for the GenLayer Hackathon · 2026</span><a href="https://genlayer.com" target="_blank"><Github size={16}/> GenLayer</a></footer>
    </main>
  );
}
