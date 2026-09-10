"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FULSETA_CONTRACT || "0x086B0f5142970aC912344fb73147653f8Aca4Df0";
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("No EIP-1193 wallet found. Install MetaMask or another compatible wallet.");
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const account = accounts?.[0];
  if (!account) throw new Error("Wallet connection was not approved.");

  const client = createClient({
    chain: studionet,
    account,
    provider: window.ethereum,
  });

  await client.connect("studionet");
  return { client, account };
}

export function getReadClient() {
  return createClient({ chain: studionet });
}

async function write(functionName: string, args: unknown[], value?: bigint) {
  if (!CONTRACT_ADDRESS) throw new Error("Set NEXT_PUBLIC_FULSETA_CONTRACT after deploying the Intelligent Contract.");
  const { client } = await connectWallet();
  const call: any = {
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  };
  if (value !== undefined) call.value = value;

  const estimate = await client.estimateTransactionFeesForWrite(call);
  const hash = await client.writeContract({
    ...call,
    fees: {
      distribution: estimate.distribution,
      feeValue: estimate.feeValue,
    },
  });

  const receipt = await client.waitForFinalization({ hash });

if (receipt.txExecutionResultName !== "FINISHED_WITH_RETURN") {
  throw new Error(
    `GenLayer transaction failed: ${receipt.statusName || "unknown status"}`
  );
}

return { hash, receipt };

export const createAgreement = (dealId: string, worker: string, task: string, requirements: string, deadline: string) =>
  write("create_agreement", [dealId, worker, task, requirements, deadline]);

export const fundAgreement = (dealId: string, genAmount: string) => {
  const value = BigInt(Math.round(Number(genAmount) * 1e6)) * 10n ** 12n;
  return write("fund_agreement", [dealId], value);
};

export const submitEvidence = (dealId: string, url: string) =>
  write("submit_evidence", [dealId, url]);

export const evaluateWork = (dealId: string) =>
  write("evaluate_work", [dealId]);

export const refundFailed = (dealId: string) =>
  write("refund_failed", [dealId]);

export async function readAgreement(dealId: string) {
  if (!CONTRACT_ADDRESS) throw new Error("Contract address not configured.");
  const client = getReadClient();
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement",
    args: [dealId],
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  });
}
