# Fulseta

Fulseta verifies public work evidence using GenLayer web access, AI reasoning, and validator consensus.

## Active deployment

- Network: Studio Dev / Studio Next (chain ID 61997).
- Contract: `0x1a125Ec139981FC429089de6D646F9e380773EC0`.
- Source: `contracts/proofpay.py`, matching the logic of the deployed `fulseta_final.py`.
- The frontend pins this address in `lib/genlayer.ts`.

## Run locally

```bash
npm install
npm run dev
```

Connect an EIP-1193 wallet such as MetaMask to Studio Dev.

## Demo flow

1. Create an agreement with a unique deal ID, task, and success requirements.
2. Load the agreement by its deal ID.
3. Submit a publicly accessible evidence URL.
4. Run consensus.
5. Reload to see PASS / COMPLETED or FAIL / FAILED and the consensus summary.

## Contract interface

- `create_agreement(deal_id, task, requirements)`
- `submit_evidence(deal_id, evidence_url)`
- `evaluate_work(deal_id)`
- Views: `get_status`, `get_task`, `get_requirements`, `get_evidence`, `get_verdict`, `get_reasoning`; each takes the deal ID.

## Current scope

This deployment verifies work. It does not implement deposits, escrow, payouts, worker authorization, deadlines, or payment amounts. Anyone can submit evidence or request evaluation for an agreement. The displayed reasoning is a fixed consensus summary, not the AI's free-form explanation.

Evidence must return useful public text through GenLayer web access. Network transaction fees are estimated from the current fee policy.

## Deploy

Paste the contract source into Studio Dev to deploy a new instance if needed. To use another instance, update the pinned address in `lib/genlayer.ts`.

GitHub pushes to the connected Vercel project trigger deployment.
