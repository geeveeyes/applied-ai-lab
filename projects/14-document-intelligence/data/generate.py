"""Generates synthetic commercial contracts plus gold labels (deterministic, seed 7).

Shaped like CUAD (commercial contracts with labeled clauses) but invented. Every
field is phrased in several ways, and some contracts include decoy numbers and
dates so naive extractors fail in instructive ways.

    python3 data/generate.py
"""
import json
import random
import textwrap
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
rng = random.Random(7)

PROVIDERS = ["Helix Cloud Inc.", "Bramble Analytics LLC", "Orion Logistics Corp.", "Quill Software Ltd.", "Marlow Data Systems Inc."]
CUSTOMERS = ["Fabrikam Retail Group", "Contoso Health Partners", "Tailspin Travel Co.", "Northwind Foods Inc.", "Adatum Energy LLC", "Litware Education Corp."]
LAWS = ["Delaware", "New York", "California", "Texas", "England and Wales"]
WORDS = {12: "twelve", 18: "eighteen", 24: "twenty-four", 36: "thirty-six", 15: "fifteen", 30: "thirty", 45: "forty-five", 60: "sixty", 90: "ninety", 10: "ten", 20: "twenty"}
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def ordinal(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def num(n, style):
    return f"{WORDS[n]} ({n})" if style == "words" and n in WORDS else str(n)


def effective_date(d):
    style = "unseen" if rng.random() < 0.15 else rng.choice(["long", "numeric", "ordinal", "iso"])
    text = {
        "unseen": f"Effective as of the {ordinal(d.day)} of {MONTHS[d.month - 1]} {d.year}, the parties enter into this Master Services Agreement.",
        "long": f"This Master Services Agreement is effective as of {MONTHS[d.month - 1]} {d.day}, {d.year} (the \"Effective Date\").",
        "numeric": f"This Master Services Agreement is dated {d.month:02d}/{d.day:02d}/{d.year} and takes effect on that date.",
        "ordinal": f"This Master Services Agreement commences on the {ordinal(d.day)} day of {MONTHS[d.month - 1]}, {d.year}.",
        "iso": f"Effective Date: {d.isoformat()}. This Master Services Agreement is entered into on the Effective Date.",
    }[style]
    return text, style


def term(months):
    if rng.random() < 0.15:
        return f"The Agreement remains in force for {months} months after the Effective Date.", "unseen"
    style = rng.choice(["digits", "words", "years"])
    if style == "years" and months % 12 == 0:
        years = months // 12
        return f"The initial term of this Agreement is {num(years, 'words') if years in WORDS else years} {'year' if years == 1 else 'years'} from the Effective Date.", style
    if style == "words" and months in WORDS:
        return f"The initial term shall be {WORDS[months]} ({months}) months from the Effective Date.", style
    return f"The Agreement shall continue for a period of {months} months from the Effective Date (the \"Initial Term\").", "digits"


def renewal(auto):
    if auto:
        style = rng.choice(["auto", "evergreen"])
        return {"auto": "Following the Initial Term, this Agreement automatically renews for successive one-year periods unless either party gives notice of non-renewal.",
                "evergreen": "This Agreement is evergreen and renews automatically at the end of each term."}[style], style
    style = rng.choice(["no_auto", "mutual"])
    return {"no_auto": "This Agreement shall not renew automatically; any renewal requires a written amendment signed by both parties.",
            "mutual": "Renewal occurs only by mutual written agreement, and the Agreement expires at the end of the term otherwise."}[style], style


def payment(days):
    style = "unseen" if rng.random() < 0.15 else rng.choice(["net", "within", "after"])
    return {
        "unseen": f"Customer's payment obligation arises {days} days following the date of each invoice.","net": f"Fees are invoiced monthly, payment terms Net {days}.",
            "within": f"Customer shall pay each invoice within {num(days, 'words')} days of receipt.",
            "after": f"All invoices are due {days} days after the invoice date."}[style], style


def termination(days):
    style = "unseen" if rng.random() < 0.15 else rng.choice(["convenience", "prior"])
    return {
        "unseen": f"Either party may end this Agreement on {days} days' notice, for any reason.","convenience": f"Either party may terminate this Agreement for convenience upon {days} days' written notice to the other party.",
            "prior": f"Termination without cause requires {num(days, 'words')} days prior written notice."}[style], style


def law(name):
    style = rng.choice(["governed", "construed"])
    if name == "England and Wales":
        return "This Agreement is governed by the laws of England and Wales.", style
    return {"governed": f"This Agreement shall be governed by the laws of the State of {name}.",
            "construed": f"This Agreement shall be construed in accordance with {name} law."}[style], style


def cap(amount):
    if amount is None:
        style = rng.choice(["fees", "unlimited"])
        return {"fees": "Each party's aggregate liability is limited to the fees paid in the twelve (12) months preceding the claim.",
                "unlimited": "Nothing in this Agreement limits either party's liability for breach of confidentiality."}[style], style
    style = rng.choice(["exceed", "usd"])
    return {"exceed": f"Neither party's total liability shall exceed ${amount:,}.",
            "usd": f"Aggregate liability under this Agreement is capped at USD {amount:,}."}[style], style


def build(i):
    provider, customer = rng.sample(PROVIDERS, 1)[0], rng.choice(CUSTOMERS)
    d = date(rng.choice([2023, 2024, 2025]), rng.randint(1, 12), rng.randint(1, 28))
    months = rng.choice([12, 18, 24, 36])
    auto = rng.random() < 0.5
    pay = rng.choice([15, 30, 45, 60])
    notice = rng.choice([30, 60, 90])
    jurisdiction = rng.choice(LAWS)
    amount = rng.choice([None, 250000, 500000, 1200000])
    decoy = rng.random() < 0.4
    sections, variants = [], {}
    parts = [
        ("effective_date", effective_date(d)), ("term_months", term(months)), ("auto_renewal", renewal(auto)),
        ("payment_terms_days", payment(pay)), ("termination_notice_days", termination(notice)),
        ("governing_law", law(jurisdiction)), ("liability_cap_usd", cap(amount)),
    ]
    for field, (sentence, style) in parts:
        sections.append(sentence)
        variants[field] = style
    if decoy:
        other = date(d.year - 1, rng.randint(1, 12), rng.randint(1, 28))
        sections.insert(1, f"This Agreement supersedes the Order Form signed on {MONTHS[other.month - 1]} {other.day}, {other.year}.")
        sections.insert(4, "Late payments accrue interest after a grace period of 10 days, and customers must give 90 days notice before changing their billing contact.")
        sections.append("Support credits are capped at $5,000 per quarter.")
    header = f"MASTER SERVICES AGREEMENT\nbetween {provider} (\"Provider\") and {customer} (\"Customer\")\n"
    body = "\n\n".join(f"{n}. {s}" for n, s in enumerate(sections, 1))
    wrapped = "\n".join(textwrap.fill(par, width=58) for par in body.split("\n\n"))
    footer = f"\n\nPage 1 of 2 -- Confidential -- {provider} MSA v{rng.randint(1, 4)}\n"
    text = header + "\n" + wrapped + footer
    if rng.random() < 0.3:
        text = text.replace(" the ", "  the ", 4)
    labels = {"effective_date": d.isoformat(), "term_months": months, "auto_renewal": auto, "payment_terms_days": pay,
              "termination_notice_days": notice, "governing_law": jurisdiction, "liability_cap_usd": amount}
    return f"c{i:03d}", text, {"fields": labels, "variants": variants, "decoy": decoy, "provider": provider, "customer": customer}


def main():
    labels = {}
    for old in (HERE / "contracts").glob("*.txt"):
        old.unlink()
    for i in range(1, 41):
        doc_id, text, meta = build(i)
        (HERE / "contracts" / f"{doc_id}.txt").write_text(text)
        labels[doc_id] = meta
    (HERE / "labels.json").write_text(json.dumps(labels, indent=1) + "\n")
    print(f"wrote {len(labels)} contracts")


if __name__ == "__main__":
    main()
