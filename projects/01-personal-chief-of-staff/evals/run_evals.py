import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.providers.mock_provider import MockProvider
from app.schema import normalize_response
from app.tools import score_prompt


def main():
    cases_path = ROOT / "evals" / "cases" / "basic.jsonl"
    cases = [json.loads(line) for line in cases_path.read_text().splitlines() if line.strip()]
    provider = MockProvider()
    results = []

    for case in cases:
        context = {"tools": {"priority_scorer": score_prompt(case["prompt"])}}
        output = normalize_response(provider.complete(case["prompt"], context))
        text = json.dumps(output).lower()
        missing = [term for term in case["must_include"] if term.lower() not in text]
        passed = not missing and bool(output["summary"]) and bool(output["next_actions"])
        results.append({"id": case["id"], "passed": passed, "missing": missing})

    passed_count = sum(1 for result in results if result["passed"])
    for result in results:
        mark = "PASS" if result["passed"] else "FAIL"
        print(f"{mark} {result['id']}")
        if result["missing"]:
            print(f"  missing: {', '.join(result['missing'])}")

    print(f"\n{passed_count}/{len(results)} evals passed")
    raise SystemExit(0 if passed_count == len(results) else 1)


if __name__ == "__main__":
    main()
