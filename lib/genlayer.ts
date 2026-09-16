"use client";

import { createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_FULSETA_CONTRACT ||
  "0x23d64537B4D488D30550E5B923887ecB6da8Fc8b"
) as `0x${string}`;

export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function connectWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No EIP-1193 wallet found. Install MetaMask or another compatible wallet.");
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const account = accounts?.[0] as `0x${string}` | undefined;
  if (!account) throw new Error("Wallet connection was not approved.");

  const client = createClient({
    chain: studioDevnet,
    account,
    provider: window.ethereum,
  });

  await client.connect("studioDevnet");
  return { client, account };
}

export function getReadClient() {
  return createClient({ chain: studioDevnet });
}

async function write(functionName: string, args: any[]) {
  const { client } = await connectWallet();

  const call = {
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  };

  // The Studio-dev simulation helper currently fails on this deployed contract
  // before it can return a fee recommendation. Quote a conservative developer
  // preset from the live Studio-dev fee policy instead, then submit that quote.
  const estimate = await client.estimateTransactionFees({
    leaderTimeunitsAllocation: 300n,
    validatorTimeunitsAllocation: 300n,
    executionBudgetPerRound: 1_000_000_000_000_000_000n,
    totalMessageFees: 0n,
    appealRounds: 0n,
    rotations: [2n],
  });

  const hash = await client.writeContract({
    ...call,
    fees: {
      distribution: estimate.distribution,
      feeValue: estimate.feeValue,
    },
  } as any);

  const transaction = await client.waitForFinalization({ hash });

  if (!isSuccessful(transaction)) {
    throw new Error(
      `GenLayer transaction failed: ${transaction.statusName || "unknown status"} / ${transaction.txExecutionResultName || "unknown result"}`
    );
  }

  return { hash, receipt: transaction };
}

export const createAgreement = (
  dealId: string,
  worker: string,
  task: string,
  requirements: string,
  deadline: string,
  amount: string
) => {
  const normalizedAmount = amount.trim();
  if (!/^\d+$/.test(normalizedAmount)) {
    throw new Error("Agreed payment must be a whole number of GEN.");
  }

  return write("create_agreement", [
    dealId,
    worker,
    task,
    requirements,
    deadline,
    BigInt(normalizedAmount),
  ]);
};

export const submitEvidence = (dealId: string, url: string) =>
  write("submit_evidence", [dealId, url]);

export const evaluateWork = (dealId: string) =>
  write("evaluate_work", [dealId]);

export async function readAgreement(dealId: string) {
  const client = getReadClient();
  const read = (functionName: string) =>
    client.readContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args: [dealId],
    });

  const [status, task, requirements, evidenceUrl, verdict, reasoning, amount] =
    await Promise.all([
      read("get_status"),
      read("get_task"),
      read("get_requirements"),
      read("get_evidence"),
      read("get_verdict"),
      read("get_reasoning"),
      read("get_amount"),
    ]);

  return {
    exists: Boolean(status),
    deal_id: dealId,
    task,
    requirements,
    evidence_url: evidenceUrl,
    status,
    verdict,
    reasoning,
    amount,
  };
}
