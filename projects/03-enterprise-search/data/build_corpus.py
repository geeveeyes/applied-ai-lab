"""Writes data/corpus.json: a synthetic Northwind Labs workspace.

Shaped like Enterprise RAG Bench (Slack, email, Jira, Confluence). Facts are
invented. Run `python3 data/build_corpus.py` after editing this file.
"""
import json
from pathlib import Path

D = []


def add(id, source, title, groups, text):
    D.append({"id": id, "source": source, "title": title, "groups": groups, "text": text.strip()})


add("confluence-pto-policy", "confluence", "Paid Time Off Policy", ["all"], """
Northwind employees accrue 1.5 days of paid time off per month, up to 18 days per year. Sick leave is tracked separately and does not reduce the PTO balance.

Unused vacation days may be carried over into the next calendar year, up to a maximum of 5 days. Anything above that is forfeited on January 31.

Requests longer than 3 days must be submitted in Workday at least 2 weeks in advance and approved by your manager.
""")
add("confluence-parental-leave", "confluence", "Parental Leave Policy", ["all"], """
Primary caregivers receive 16 weeks of fully paid parental leave. Secondary caregivers receive 8 weeks of fully paid leave.

Leave may be taken in one block or split into two blocks within the first 12 months after birth or adoption. Notify People Operations at least 30 days before the planned start date.
""")
add("confluence-expense-policy", "confluence", "Travel and Expense Policy", ["all"], """
Book flights and hotels through Concur. Meals while traveling are reimbursed up to $75 per day. Alcohol is not reimbursable.

Submit receipts within 30 days of the expense. Any single purchase over $2,500 needs written approval from a VP before it is made.
""")
add("confluence-remote-work", "confluence", "Remote Work Guidelines", ["all"], """
Remote employees receive a one-time $600 home office stipend, paid with the first paycheck after the start date.

Core collaboration hours are 10am to 3pm PT. Meetings should be scheduled inside that window unless all attendees agree otherwise.

Coworking memberships are reimbursed up to $200 per month with a receipt.
""")
add("confluence-oncall-runbook", "confluence", "On-Call Runbook", ["eng", "all"], """
The primary on-call engineer rotates weekly. Handoff happens Monday at 10am PT in the #eng-oncall channel.

For a sev1 incident the primary must acknowledge the page within 5 minutes. If there is no acknowledgement after 10 minutes, the page escalates to the secondary on-call, then to the engineering manager.

Do not silence alerts without a linked ticket. Alert thresholds are reviewed each quarter.
""")
add("confluence-incident-process", "confluence", "Incident Management Process", ["eng", "all"], """
Severity levels: sev1 means customer-facing outage or data loss; sev2 means major degradation; sev3 means minor impact with a workaround.

The incident commander owns communication. A written postmortem is due within 5 business days of resolution for every sev1 and sev2 incident, and it must be blameless.
""")
add("confluence-security-basics", "confluence", "Security Basics", ["all"], """
All employees must use the company password manager and enable multi-factor authentication on every account.

Access to production systems requires a hardware security key. Authenticator apps and SMS codes are not accepted for production.

Laptops must have full-disk encryption. A lost or stolen device must be reported to security within 1 hour of discovery.
""")
add("confluence-okrs-q3", "confluence", "Q3 Company OKRs", ["all"], """
Objective 1: make search feel instant. Key result: reduce p95 search latency to under 400ms.

Objective 2: launch Atlas self-serve billing for small teams.

Objective 3: complete the SOC 2 Type II audit with no major findings.
""")
add("confluence-vendor-procurement", "confluence", "Vendor Procurement", ["all"], """
Every new vendor needs a security review and a signed data processing agreement before any customer data is shared.

Contracts above $50,000 per year require legal review. Legal and security each commit to a 10 business day turnaround.
""")
add("confluence-api-limits", "confluence", "Public API Rate Limits", ["all"], """
The public API allows 600 requests per minute per API key, with a burst allowance of 100 requests.

When the limit is exceeded the API returns HTTP 429 with a Retry-After header. Clients should back off exponentially and must not retry in a tight loop.
""")
add("confluence-onboarding", "confluence", "New Hire Onboarding Checklist", ["all"], """
Week one: pick up your laptop from IT, meet your assigned buddy, and join your team channel.

Complete the mandatory security awareness training within 7 days of your start date. Set up your hardware key if your role needs production access.
""")

add("jira-ENG-1423", "jira", "ENG-1423: Search latency regression after index migration", ["eng", "all"], """
Status: Resolved. Reporter: Marcus. Assignee: Priya.

After the index migration, p95 search latency rose from 380ms to 910ms. Dashboards showed the slowdown only on the first requests after each deploy.

Root cause: new shard replicas were not warmed up, so early queries hit cold caches. Fix: enable replica warmup before traffic is shifted. p95 returned to 395ms after the change.
""")
add("jira-ENG-1501", "jira", "ENG-1501: Billing webhook creates duplicate invoices", ["eng", "all"], """
Status: In Progress. Assignee: Priya.

When the payment provider retries a webhook after a timeout, our handler creates a second invoice for the same payment. Proposed fix: store the provider event id as an idempotency key and ignore events already processed. This bug blocks the Atlas self-serve billing launch.
""")
add("jira-SUP-872", "jira", "SUP-872: Contoso users stuck in SSO login loop", ["all"], """
Status: Resolved.

Contoso reported that users signing in with Okta were redirected back to the login page repeatedly. Investigation found clock skew of about 90 seconds between their identity provider and our servers, which made SAML assertions look expired.

Fix: we now accept up to 2 minutes of clock skew on SAML assertions. Contoso confirmed logins work.
""")
add("jira-ENG-1388", "jira", "ENG-1388: Upgrade Postgres 13 to 15", ["eng", "all"], """
Status: Scheduled.

The upgrade will run during a maintenance window on October 19 from 02:00 to 04:00 UTC. Customers see read-only mode for about 20 minutes.

Rollback plan: keep the Postgres 13 replica for 7 days and promote it if checksum validation fails.
""")

add("slack-eng-oncall", "slack", "#eng-oncall", ["eng", "all"], """
[09:12] marcus: disk alert flapped three times last night on db-replica-2
[09:14] priya: yeah it pages at 75% and the nightly vacuum pushes it over every time
[09:15] dana-k: lunch order for friday is open, add yours to the sheet
[09:20] marcus: proposal: raise the disk usage threshold to 85% and add a separate 92% critical alert
[09:22] priya: +1, agreed. 85% warning, 92% critical. I will update the alert config today
[09:31] marcus: great, closing the loop. decision made, threshold is 85% from now on
""")
add("slack-launch-atlas", "slack", "#atlas-launch", ["all"], """
[14:02] lena: heads up, the Atlas launch is moving from October 14 to October 28
[14:03] omar: because of the duplicate invoice bug in the billing webhook?
[14:03] lena: yes, we will not launch billing with that open
[14:10] omar: pricing question, are we still at $29 per seat for the Starter plan?
[14:11] lena: yes, Starter is $29 per seat per month, Team is $59
[14:15] sam: reminder that the launch blog draft is in the shared drive
""")
add("slack-ask-hr", "slack", "#ask-hr", ["all"], """
[11:40] jo: how long is parental leave again? asking for a friend
[11:42] hr-bot: primary caregivers get 16 weeks and secondary caregivers get 8 weeks, fully paid. Details are on the Parental Leave Policy page
[11:50] jo: thanks! and can I roll my leftover vacation into next year?
[11:52] hr-bot: yes, up to 5 days carry over
""")
add("slack-security-alerts", "slack", "#security-alerts", ["all"], """
[16:05] security-bot: a phishing campaign impersonating IT is circulating, subject line "Password expires today"
[16:07] aisha: if you got it, do not click anything. Use the Report Phish button in your mail client, it forwards the message to security and removes it from your inbox
[16:09] aisha: we have blocked the sender domain, thanks to everyone who reported
""")
add("slack-data-eng", "slack", "#data-eng", ["eng", "all"], """
[10:00] ravi: vector store decision for the new search service: pgvector or a hosted vector database?
[10:04] priya: we have under 5M vectors and already run Postgres, so pgvector keeps operations simple and avoids a new vendor review
[10:06] ravi: agreed. We revisit if we pass 20M vectors or need sub-10ms filtered search
[10:07] ravi: decision: pgvector for now
""")

add("email-allhands", "email", "All-hands and leadership update", ["all"], """
From: Chen (CEO)
Subject: All-hands on October 24

Team, our next all-hands is on October 24 at 9am PT. We will share the Q3 results and the plan for Atlas.

I am excited to announce that Dana Whitfield is joining as our new Head of Support, starting November 3. Dana previously ran support operations at a large payments company.
""")
add("email-fabrikam-renewal", "email", "Fabrikam renewal and discount", ["finance"], """
From: Tom (Sales)
Subject: Fabrikam renewal

Fabrikam wants to renew for 12 months at $240,000 and is asking for a 15% discount.

Per the discount policy, account executives may approve up to 10% on their own. Anything above 10% needs CFO approval. I suggest we offer 10% and a multi-year option.
""")
add("email-zephyr-dpa", "email", "Zephyr Analytics DPA signed", ["finance", "all"], """
From: Legal
Subject: Zephyr Analytics DPA

The data processing agreement with Zephyr Analytics is fully executed. Zephyr will store all Northwind customer data in the EU region only, and has agreed to give 30 days notice before adding any subprocessor.
""")
add("email-board-update", "email", "Board update draft", ["exec"], """
From: CFO
Subject: Q3 board update (confidential)

Q3 ARR closed at $18.4M, up 22 percent from the previous quarter. Net revenue retention was 118 percent. Cash runway is 31 months.
""")

Path(__file__).with_name("corpus.json").write_text(json.dumps(D, indent=1) + "\n")
print(f"wrote {len(D)} documents")
