
"use client";

import { createClient } from "genlayer-js";
import { bradbury } from "genlayer-js/chains";
import {
  TransactionHashVariant,
  TransactionStatus,
} from "genlayer-js/types";

export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_FULSETA_CONTRACT ||
  "0x086B0f5142970aC912344fb73147653f8Aca4Df0"
) as `0x${string}`;

export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 /**
 * Connect user's browser wallet to GenLayer Bradbury Testnet.
 */.
 */
export async function connectWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "No EIP-1193 wallet found. Install MetaMask or another compatible wallet."
    );
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  const account = accounts?.[0] as `0x${string}` | undefined;

  if (!account) {
    throw new Error("Wallet connection was not approved.");
  }

  const client = createClient({
   chain: bradbury,
    account,
    provider: window.ethereum,
  });

  await client.connect("bradbury");;

  return {
    client,
    account,
  };
}

/**
 * Read-only GenLayer client.
 */
export function getReadClient() {
 return createClient({
  chain: bradbury,
});
}

/**
 * Send a transaction to the deployed Fulseta Intelligent Contract.
 */
async function write(
  functionName: string,
  args: any[],
  value?: bigint
) {
  const { client } = await connectWallet();

  const call: any = {
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  };

  if (value !== undefined) {
    call.value = value;
  }

  const hash = await client.writeContract(call);

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
  });

  if (receipt.txExecutionResultName !== "FINISHED_WITH_RETURN") {
    throw new Error(
      `GenLayer transaction failed: ${
        receipt.statusName || "unknown status"
      } / ${
        receipt.txExecutionResultName || "unknown result"
      }`
    );
  }

  return {
    hash,
    receipt,
  };
}

/**
 * Create a new work agreement.
 */
export const createAgreement = (
  dealId: string,
  worker: string,
  task: string,
  requirements: string,
  deadline: string
) =>
  write("create_agreement", [
    dealId,
    worker,
    task,
    requirements,
    deadline,
  ]);

/**
 * Fund an existing agreement with GEN.
 */
export const fundAgreement = (
  dealId: string,
  genAmount: string
) => {
  const numericAmount = Number(genAmount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error("Enter a valid GEN amount.");
  }

  const value = BigInt(
    Math.round(numericAmount * 1_000_000)
  ) * BigInt(1_000_000_000_000);

  return write(
    "fund_agreement",
    [dealId],
    value
  );
};

/**
 * Submit public evidence URL for completed work.
 */
export const submitEvidence = (
  dealId: string,
  url: string
) =>
  write("submit_evidence", [
    dealId,
    url,
  ]);

/**
 * Ask GenLayer validators to evaluate the submitted work.
 */
export const evaluateWork = (
  dealId: string
) =>
  write("evaluate_work", [
    dealId,
  ]);

/**
 * Refund a failed agreement.
 */
export const refundFailed = (
  dealId: string
) =>
  write("refund_failed", [
    dealId,
  ]);

/**
 * Read an agreement from the Intelligent Contract.
 */
export async function readAgreement(
  dealId: string
) {
  const client = getReadClient();

  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement",
    args: [dealId],
    transactionHashVariant:
      TransactionHashVariant.LATEST_FINAL,
  });
}
