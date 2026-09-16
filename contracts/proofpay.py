# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import genlayer as gl
from genlayer.types import *
import json


class Fulseta(gl.contract.Contract):
    clients: gl.storage.TreeMap[str, Address]
    workers: gl.storage.TreeMap[str, Address]
    tasks: gl.storage.TreeMap[str, str]
    requirements: gl.storage.TreeMap[str, str]
    deadlines: gl.storage.TreeMap[str, str]
    evidence_urls: gl.storage.TreeMap[str, str]
    statuses: gl.storage.TreeMap[str, str]
    verdicts: gl.storage.TreeMap[str, str]
    reasonings: gl.storage.TreeMap[str, str]
    amounts: gl.storage.TreeMap[str, u256]

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
        amount: u256,
    ) -> None:
        if self.statuses.get(deal_id, "") != "":
            raise gl.vm.UserError("Deal ID already exists")

        if len(deal_id) < 3:
            raise gl.vm.UserError("Deal ID is too short")

        if len(task) < 10:
            raise gl.vm.UserError("Task must be descriptive")

        if len(requirements) < 10:
            raise gl.vm.UserError("Requirements must be descriptive")

        if amount == u256(0):
            raise gl.vm.UserError("Agreed payment must be greater than zero")

        self.clients[deal_id] = gl.message.sender_address
        self.workers[deal_id] = Address(worker)
        self.tasks[deal_id] = task
        self.requirements[deal_id] = requirements
        self.deadlines[deal_id] = deadline
        self.amounts[deal_id] = amount
        self.evidence_urls[deal_id] = ""
        self.statuses[deal_id] = "CREATED"
        self.verdicts[deal_id] = ""
        self.reasonings[deal_id] = ""

    @gl.public.write
    def submit_evidence(self, deal_id: str, evidence_url: str) -> None:
        if self.statuses.get(deal_id, "") != "CREATED":
            raise gl.vm.UserError("Agreement is not ready for evidence")

        if gl.message.sender_address != self.workers[deal_id]:
            raise gl.vm.UserError("Only the assigned worker can submit evidence")

        if not (
            evidence_url.startswith("https://")
            or evidence_url.startswith("http://")
        ):
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
            html = page.body.decode("utf-8", errors="ignore")
            evidence_content = html[:22000]

            prompt = f"""
You are FULSETA, an impartial work verification judge.

Determine whether the submitted public evidence satisfies the agreement.
Judge only facts supported by the evidence. Do not invent facts.

TASK:
{task}

REQUIREMENTS:
{requirements}

DEADLINE:
{deadline}

EVIDENCE URL:
{evidence_url}

EVIDENCE CONTENT:
{evidence_content}

Return ONLY valid JSON:
{{
  "verdict": "PASS" or "FAIL",
  "reasoning": "A concise explanation tied directly to the requirements."
}}

The verdict must be PASS or FAIL.
PASS only when the available evidence sufficiently demonstrates that all
material requirements were satisfied.
If the evidence is inaccessible, incomplete, or does not prove a material
requirement, return FAIL.
"""

            raw = gl.nondet.exec_prompt(prompt).strip()

            try:
                cleaned = raw.strip()

                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                elif cleaned.startswith("```"):
                    cleaned = cleaned[3:]

                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]

                data = json.loads(cleaned.strip())
            except Exception:
                data = {
                    "verdict": "FAIL",
                    "reasoning": "The evidence analysis could not be parsed.",
                }

            verdict = str(data.get("verdict", "FAIL")).upper()

            if verdict not in ["PASS", "FAIL"]:
                verdict = "FAIL"

            return {
                "verdict": verdict,
                "reasoning": str(
                    data.get("reasoning", "No reasoning returned")
                )[:1200],
            }

        result = gl.eq_principle.prompt_comparative(
            judge,
            """
The verdict field must agree exactly as PASS or FAIL.

The reasoning does not need identical wording, but it must be substantively
consistent about whether the submitted evidence satisfies the material
agreement requirements.

Validators must independently evaluate the evidence and must not accept
unsupported claims.
""",
        )

        verdict = str(result["verdict"]).upper()
        reasoning = str(result["reasoning"])[:1200]

        self.verdicts[deal_id] = verdict
        self.reasonings[deal_id] = reasoning

        if verdict == "PASS":
            self.statuses[deal_id] = "COMPLETED"
        else:
            self.statuses[deal_id] = "FAILED"

    @gl.public.view
    def get_status(self, deal_id: str) -> str:
        return self.statuses.get(deal_id, "")

    @gl.public.view
    def get_task(self, deal_id: str) -> str:
        return self.tasks.get(deal_id, "")

    @gl.public.view
    def get_requirements(self, deal_id: str) -> str:
        return self.requirements.get(deal_id, "")

    @gl.public.view
    def get_evidence(self, deal_id: str) -> str:
        return self.evidence_urls.get(deal_id, "")

    @gl.public.view
    def get_verdict(self, deal_id: str) -> str:
        return self.verdicts.get(deal_id, "")

    @gl.public.view
    def get_reasoning(self, deal_id: str) -> str:
        return self.reasonings.get(deal_id, "")

    @gl.public.view
    def get_amount(self, deal_id: str) -> u256:
        return self.amounts.get(deal_id, 0)
