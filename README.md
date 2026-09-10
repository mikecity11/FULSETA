# Fulseta

**Verified work. Automatic payment.**

Fulseta is an outcome-based escrow dApp for internet work. A client defines a task and success conditions, locks GEN, a worker submits public evidence, and a GenLayer Intelligent Contract uses web access + LLM reasoning + validator consensus to decide whether payment should be released.

## Why GenLayer

The core settlement decision is subjective enough that an ordinary deterministic smart contract cannot reliably make it. Fulseta uses:

- `gl.nondet.web.get(...)` to retrieve public evidence.
- `gl.nondet.exec_prompt(...)` to judge evidence against plain-English requirements.
- `gl.eq_principle.prompt_comparative(...)` so validators independently evaluate and agree on the substantive verdict.
- Payable write methods + value transfers for escrow settlement.

## Fastest launch path

### 1) Run the website locally

```bash
npm install
npm run dev
```

The site starts in demo mode by default, so you can inspect the full UI before the contract is deployed.

### 2) Deploy the Intelligent Contract

Install the GenLayer CLI:

```bash
npm install -g genlayer
```

Set stable Studionet:

```bash
genlayer network set studionet
genlayer network info
```

Deploy:

```bash
genlayer deploy --contract contracts/fulseta.py
```

Copy the deployed Intelligent Contract address.

You can alternatively paste `contracts/fulseta.py` into GenLayer Studio and deploy it there.

### 3) Configure real mode

Create `.env.local`:

```bash
NEXT_PUBLIC_FULSETA_CONTRACT=0x086B0f5142970aC912344fb73147653f8Aca4Df0
NEXT_PUBLIC_DEMO_MODE=false
```

Restart:

```bash
npm run dev
```

Connect an EIP-1193 wallet such as MetaMask and test a small GEN amount.

### 4) Deploy on Vercel

Push this folder to GitHub and import the repo in Vercel.

In **Vercel → Project → Settings → Environment Variables**, add:

```text
NEXT_PUBLIC_FULSETA_CONTRACT = 0x086B0f5142970aC912344fb73147653f8Aca4Df0
NEXT_PUBLIC_DEMO_MODE = false
```

Then deploy.

## Suggested hackathon demo

1. Client connects wallet.
2. Client creates a creator agreement and funds it.
3. Worker connects their wallet and submits a public content URL.
4. Trigger `Run consensus`.
5. Show GenLayer validators judging the evidence.
6. Show the PASS verdict and automatic payout.

For a fast demo, create two browser profiles/wallet accounts: one client and one worker.

## Current MVP constraints

This is a hackathon MVP:
- Evidence must be reachable by GenLayer's web access.
- Some sites may block automated retrieval; use a public page that returns useful HTML/text for the demo.
- Deadline is included in the judgment context but the MVP does not independently query a trusted timestamp source for publication time.
- Failed deals can be refunded by the client through `refund_failed`; the current UI focuses on the successful happy path.
- Test with small testnet/studionet amounts first.

## Product direction

Start with creator sponsorship escrow, then expand to developer bounties, freelance delivery, referral payouts, and agent-to-agent work.


## Deployed GenLayer contract

`0x086B0f5142970aC912344fb73147653f8Aca4Df0`

## Brand

The frontend uses the selected Fulseta identity: two overlapping circles connected by a forward arrow, representing verified work moving into released payment. The logo asset is at `public/fulseta-logo.svg` and the same mark is used as the app/favicon icon.

## Brand

The public product name is **FULSETA** — *Work verified. Payment released.* The selected mark uses two overlapping circles and a forward arrow: completed work moves through verification into released payment.

### Deployed contract note

The deployed Studionet contract at `0x086B0f5142970aC912344fb73147653f8Aca4Df0` was deployed before the final product rename. Its Python source is intentionally preserved in `contracts/proofpay.py` with the original internal `ProofPay` class name so the repository source continues to match the deployed contract logic.
