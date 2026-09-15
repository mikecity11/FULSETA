"use client";

import {
  createClient,
  isSuccessful,
} from "genlayer-js";

import { studioDev } from "genlayer-js/chains";

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

/**
 * Connect the user's browser wallet to
 * GenLayer Studio Dev / Studio Next.
 */
export async function connectWallet() {
  if (
    typeof window === "undefined" ||
    !window.ethereum
  ) {
    throw new Error(
      "No EIP-1193 wallet found. Install MetaMask or another compatible wallet."
    );
  }

  const accounts =
    await window.ethereum.request({
      method: "eth_requestAccounts",
    });

  const account = accounts?.[0] as
    | `0x${string}`
    | undefined;

  if (!account) {
    throw new Error(
      "Wallet connection was not approved."
    );
  }

  const client = createClient({
    chain: studioDev,
    account,
    provider: window.ethereum,
  });

  await client.connect("studioDev");

  return {
    client,
    account,
  };
}

/**
 * Read-only client for Studio Dev.
 */
export function getReadClient() {
  return createClient({
    chain: studioDev,
  });
}

/**
 * Send a fee-enabled transaction to
 * the FULSETA Intelligent Contract.
 */
async function write(
  functionName: string,
  args: any[]
) {
  const { client } = await connectWallet();

  const call = {
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  };

  /**
   * Consensus v0.6 requires a fee estimate
   * for state-changing transactions.
   */
  const estimate =
    await client.estimateTransactionFeesForWrite(
      call
    );

  const hash = await client.writeContract({
    ...call,

    fees: {
      distribution: estimate.distribution,
      feeValue: estimate.feeValue,
    },
  });

  /**
   * Wait until GenLayer has finalized
   * the transaction.
   */
  const transaction =
    await client.waitForFinalization({
      hash,
    });

  if (!isSuccessful(transaction)) {
    throw new Error(
      `GenLayer transaction failed: ${
        transaction.statusName ||
        "unknown status"
      } / ${
        transaction.txExecutionResultName ||
        "unknown result"
      }`
    );
  }

  return {
    hash,
    receipt: transaction,
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
 * Submit a public evidence URL.
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
 * Ask GenLayer validators to evaluate
 * the submitted evidence.
 */
export const evaluateWork = (
  dealId: string
) =>
  write("evaluate_work", [
    dealId,
  ]);

/**
 * Read an agreement from the
 * FULSETA Intelligent Contract.
 */
export async function readAgreement(
  dealId: string
) {
  const client = getReadClient();

  const read = (functionName: string) =>
    client.readContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args: [dealId],

      // Read the latest accepted state.
      stateStatus: "accepted",
    });

  const [
    status,
    task,
    requirements,
    evidenceUrl,
    verdict,
    reasoning,
  ] = await Promise.all([
    read("get_status"),
    read("get_task"),
    read("get_requirements"),
    read("get_evidence"),
    read("get_verdict"),
    read("get_reasoning"),
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
  };
}
