# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import genlayer as gl
from genlayer.types import *


class Fulseta(gl.contract.Contract):
    tasks: gl.storage.TreeMap[str, str]
    requirements: gl.storage.TreeMap[str, str]
    evidence_urls: gl.storage.TreeMap[str, str]
    statuses: gl.storage.TreeMap[str, str]
    verdicts: gl.storage.TreeMap[str, str]
    reasonings: gl.storage.TreeMap[str, str]

    def __init__(self):
        pass

    @gl.public.write
    def create_agreement(self, deal_id: str, task: str, requirements: str) -> None:
        if self.statuses.get(deal_id, "") != "":
            raise gl.vm.UserError("Deal ID already exists")
        if deal_id == "":
            raise gl.vm.UserError("Deal ID is required")
        if task == "":
            raise gl.vm.UserError("Task is required")
        if requirements == "":
            raise gl.vm.UserError("Requirements are required")
        self.tasks[deal_id] = task
        self.requirements[deal_id] = requirements
        self.evidence_urls[deal_id] = ""
        self.statuses[deal_id] = "CREATED"
        self.verdicts[deal_id] = ""
        self.reasonings[deal_id] = ""

    @gl.public.write
    def submit_evidence(self, deal_id: str, evidence_url: str) -> None:
        if self.statuses.get(deal_id, "") != "CREATED":
            raise gl.vm.UserError("Agreement does not exist or evidence was already submitted")
        if evidence_url == "":
            raise gl.vm.UserError("Evidence URL is required")
        self.evidence_urls[deal_id] = evidence_url
        self.statuses[deal_id] = "EVIDENCE_SUBMITTED"

    @gl.public.write
    def evaluate_work(self, deal_id: str) -> None:
        if self.statuses.get(deal_id, "") != "EVIDENCE_SUBMITTED":
            raise gl.vm.UserError("Evidence must be submitted before verification")
        task = self.tasks[deal_id]
        requirements = self.requirements[deal_id]
        evidence_url = self.evidence_urls[deal_id]

        def judge() -> str:
            response = gl.nondet.web.get(evidence_url)
            content = response.body.decode("utf-8", errors="ignore")[:10000]
            prompt = f"""
You are verifying whether submitted work satisfies an agreement.

TASK:
{task}

REQUIREMENTS:
{requirements}

SUBMITTED EVIDENCE:
{content}

Determine whether the evidence clearly satisfies the task
and requirements.

Your response MUST begin with exactly one of these words:

PASS

or

FAIL

After that word, write a short explanation.

Example:

PASS The webpage is publicly accessible and contains the
required information.

Do not use JSON.
Do not use markdown.
"""
            answer = gl.nondet.exec_prompt(prompt).strip()
            if answer.upper().startswith("PASS"):
                return "PASS"
            return "FAIL"

        verdict = gl.eq_principle.prompt_comparative(
            judge,
            """
The result is equivalent when validators return the same
verdict: PASS or FAIL.

PASS means the public evidence materially satisfies the
stated task and requirements.

FAIL means it does not.
""",
        )
        verdict = str(verdict).strip().upper()
        if verdict == "PASS":
            self.verdicts[deal_id] = "PASS"
            self.reasonings[deal_id] = (
                "GenLayer validator consensus determined that "
                "the submitted evidence satisfies the agreement."
            )
            self.statuses[deal_id] = "COMPLETED"
        else:
            self.verdicts[deal_id] = "FAIL"
            self.reasonings[deal_id] = (
                "GenLayer validator consensus determined that "
                "the submitted evidence does not satisfy the agreement."
            )
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

