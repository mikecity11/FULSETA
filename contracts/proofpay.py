# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# ProofPay — outcome-based escrow powered by GenLayer consensus.
# Deploy one registry contract; users can create many deals.

from genlayer import *
import json

@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass

class ProofPay(gl.Contract):
    clients: TreeMap[str, Address]
    workers: TreeMap[str, Address]
    tasks: TreeMap[str, str]
    requirements: TreeMap[str, str]
    deadlines: TreeMap[str, str]
    evidence_urls: TreeMap[str, str]
    statuses: TreeMap[str, str]
    verdicts: TreeMap[str, str]
    reasonings: TreeMap[str, str]
    amounts: TreeMap[str, u256]

    def __init__(self):
        pass

    @gl.public.write
    def create_agreement(
        self,
        deal_id: str,
        worker: str,
        task: str,
        requirements: str,
        deadline: str,
    ) -> None:
        if self.statuses.get(deal_id, "") != "":
            raise gl.vm.UserError("Deal ID already exists")
        if len(deal_id) < 3:
            raise gl.vm.UserError("Deal ID is too short")
        if len(task) < 10 or len(requirements) < 10:
            raise gl.vm.UserError("Task and requirements must be descriptive")

        self.clients[deal_id] = gl.message.sender_address
        self.workers[deal_id] = Address(worker)
        self.tasks[deal_id] = task
        self.requirements[deal_id] = requirements
        self.deadlines[deal_id] = deadline
        self.evidence_urls[deal_id] = ""
        self.statuses[deal_id] = "CREATED"
        self.verdicts[deal_id] = ""
        self.reasonings[deal_id] = ""
        self.amounts[deal_id] = u256(0)

    @gl.public.write.payable
    def fund_agreement(self, deal_id: str) -> None:
        if self.statuses.get(deal_id, "") != "CREATED":
            raise gl.vm.UserError("Agreement is not fundable")
        if gl.message.sender_address != self.clients[deal_id]:
            raise gl.vm.UserError("Only the client can fund this agreement")
        if gl.message.value == u256(0):
            raise gl.vm.UserError("Send GEN to fund the agreement")

        self.amounts[deal_id] = gl.message.value
        self.statuses[deal_id] = "FUNDED"

    @gl.public.write
    def submit_evidence(self, deal_id: str, evidence_url: str) -> None:
        if self.statuses.get(deal_id, "") != "FUNDED":
            raise gl.vm.UserError("Agreement must be funded first")
        if gl.message.sender_address != self.workers[deal_id]:
            raise gl.vm.UserError("Only the assigned worker can submit evidence")
        if not (evidence_url.startswith("https://") or evidence_url.startswith("http://")):
            raise gl.vm.UserError("Evidence must be a public URL")

        self.evidence_urls[deal_id] = evidence_url
        self.statuses[deal_id] = "EVIDENCE_SUBMITTED"

    @gl.public.write
    def evaluate_work(self, deal_id: str) -> None:
        if self.statuses.get(deal_id, "") != "EVIDENCE_SUBMITTED":
            raise gl.vm.UserError("Evidence has not been submitted")

        task = self.tasks[deal_id]
        requirements = self.requirements[deal_id]
        deadline = self.deadlines[deal_id]
        evidence_url = self.evidence_urls[deal_id]

        def judge():
            page = gl.nondet.web.get(evidence_url)
            body = page.body.decode("utf-8", errors="ignore")
            # Limit prompt payload while preserving enough evidence for a hackathon MVP.
            body = body[:22000]

            prompt = f"""
You are ProofPay, an impartial escrow judge.

Determine whether the submitted public evidence satisfies the agreement.
Judge only what can be supported by the evidence. Do not invent facts.

TASK:
{task}

REQUIREMENTS:
{requirements}

DEADLINE:
{deadline}

EVIDENCE URL:
{evidence_url}

EVIDENCE CONTENT:
{body}

Return ONLY valid JSON:
{{
  "verdict": "PASS" or "FAIL",
  "reasoning": "A concise explanation tied directly to the requirements."
}}

A PASS requires all material requirements to be satisfied.
If the page is inaccessible, irrelevant, or lacks enough proof, return FAIL.
"""
            raw = gl.nondet.exec_prompt(prompt).strip()
            data = json.loads(raw)
            verdict = str(data.get("verdict", "")).upper()
            if verdict not in ["PASS", "FAIL"]:
                verdict = "FAIL"
            return {
                "verdict": verdict,
                "reasoning": str(data.get("reasoning", "No reasoning returned"))[:1200],
            }

        result = gl.eq_principle.prompt_comparative(
            judge,
            principle="""
The `verdict` field must be exactly the same (PASS or FAIL).
The reasoning may differ in wording, but must be substantively consistent
about which agreement requirements were or were not satisfied.
"""
        )

        verdict = str(result["verdict"]).upper()
        reasoning = str(result["reasoning"])[:1200]
        self.verdicts[deal_id] = verdict
        self.reasonings[deal_id] = reasoning

        if verdict == "PASS":
            self.statuses[deal_id] = "COMPLETED"
            amount = self.amounts[deal_id]
            self.amounts[deal_id] = u256(0)
            _Recipient(self.workers[deal_id]).emit_transfer(value=amount)
        else:
            self.statuses[deal_id] = "FAILED"

    @gl.public.write
    def refund_failed(self, deal_id: str) -> None:
        if self.statuses.get(deal_id, "") != "FAILED":
            raise gl.vm.UserError("Only failed agreements can be refunded")
        if gl.message.sender_address != self.clients[deal_id]:
            raise gl.vm.UserError("Only the client can claim the refund")

        amount = self.amounts[deal_id]
        if amount == u256(0):
            raise gl.vm.UserError("Nothing to refund")
        self.amounts[deal_id] = u256(0)
        self.statuses[deal_id] = "REFUNDED"
        _Recipient(self.clients[deal_id]).emit_transfer(value=amount)

    @gl.public.view
    def get_agreement(self, deal_id: str) -> dict:
        status = self.statuses.get(deal_id, "")
        if status == "":
            return {"exists": False}

        return {
            "exists": True,
            "deal_id": deal_id,
            "client": self.clients[deal_id].as_hex,
            "worker": self.workers[deal_id].as_hex,
            "task": self.tasks[deal_id],
            "requirements": self.requirements[deal_id],
            "deadline": self.deadlines[deal_id],
            "evidence_url": self.evidence_urls[deal_id],
            "status": status,
            "verdict": self.verdicts[deal_id],
            "reasoning": self.reasonings[deal_id],
            "amount_wei": str(self.amounts[deal_id]),
        }
