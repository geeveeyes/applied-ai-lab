import json
import unittest

from app import llm
from app.pipeline import estimate_cost, process
from app.rules import parse_number
from app.schema import normalize, validate
from evals.benchmark import load, score

CORPUS = load()
TEXT = "Header\n\n1. Effective Date: 2024-02-10. Agreement text follows here.\n2. Customer shall pay each invoice within thirty (30) days of receipt.\n"


class SchemaTests(unittest.TestCase):
    def test_ungrounded_evidence_is_removed_as_hallucination(self):
        raw = {"payment_terms_days": {"value": 45, "evidence": "payable within forty-five days"}}
        result = validate(raw, TEXT)
        self.assertIsNone(result["record"]["payment_terms_days"])
        self.assertEqual(result["fields"]["payment_terms_days"]["status"], "ungrounded")

    def test_grounded_value_passes_even_across_line_wraps(self):
        raw = {"payment_terms_days": {"value": 30, "evidence": "within thirty (30)\ndays of receipt"}}
        self.assertEqual(validate(raw, TEXT)["record"]["payment_terms_days"], 30)

    def test_type_and_range_violations_are_invalid(self):
        quote = "Effective Date: 2024-02-10"
        for field, value in (("effective_date", "10 Feb 2024"), ("term_months", True), ("term_months", 999), ("auto_renewal", "yes")):
            result = validate({field: {"value": value, "evidence": quote}}, TEXT)
            self.assertEqual(result["fields"][field]["status"], "invalid", (field, value))

    def test_unknown_fields_are_reported_and_dropped(self):
        result = validate({"favorite_color": {"value": "blue", "evidence": "x"}}, TEXT)
        self.assertNotIn("favorite_color", result["record"])
        self.assertTrue(any("unknown field" in i for i in result["issues"]))

    def test_normalize_removes_footer_and_wraps(self):
        self.assertEqual(normalize("a\nb  c\nPage 1 of 2 -- x\n"), "a b c")

    def test_parse_number_handles_words(self):
        self.assertEqual([parse_number(x) for x in ("30", "thirty", "twenty-four", "ninety")], [30, 30, 24, 90])


class ExtractorTests(unittest.TestCase):
    def test_rules_v2_beats_rules_v1_and_meets_floor(self):
        v1, v2 = score("rules_v1", CORPUS), score("rules_v2", CORPUS)
        self.assertGreater(v2["micro"]["f1"], v1["micro"]["f1"] + 0.2)
        self.assertGreaterEqual(v2["micro"]["f1"], 0.9)
        self.assertGreaterEqual(v2["micro"]["precision"], 0.98)

    def test_decoys_do_not_fool_rules_v2(self):
        result = score("rules_v2", CORPUS)
        self.assertGreaterEqual(result["accuracy_decoy"], result["accuracy_clean"] - 0.05)

    def test_unseen_phrasings_are_the_known_weakness(self):
        accuracy = score("rules_v2", CORPUS)["accuracy_by_variant"]
        unseen = [v for k, v in accuracy.items() if k.endswith(":unseen")]
        self.assertTrue(unseen and max(unseen) < 0.5)

    def test_process_rejects_short_and_oversized_documents(self):
        with self.assertRaises(ValueError):
            process("too short")
        with self.assertRaises(ValueError):
            process("x" * 60001)


class LlmTests(unittest.TestCase):
    def test_prompt_puts_glossary_before_document(self):
        prompt = llm.prompt_for(TEXT)
        self.assertLess(prompt.index("Field definitions"), prompt.index("Document:"))
        self.assertTrue(prompt.rstrip().endswith("receipt."))

    def test_model_output_flows_through_validation(self):
        import os
        os.environ["OPENAI_API_KEY"] = "test"
        answer = {f: {"value": None, "evidence": None} for f in llm.FIELDS}
        answer["payment_terms_days"] = {"value": 30, "evidence": "within thirty (30) days of receipt"}
        answer["governing_law"] = {"value": "Delaware", "evidence": "laws of the State of Delaware"}  # hallucinated
        def post(url, body, headers):
            self.assertIn("prompt_cache_key", body)
            return {"output": [{"content": [{"type": "output_text", "text": json.dumps(answer)}]}], "usage": {"input_tokens": 900, "output_tokens": 120, "input_tokens_details": {"cached_tokens": 512}}}
        result = process(TEXT, "openai", post)
        self.assertEqual(result["record"]["payment_terms_days"], 30)
        self.assertIsNone(result["record"]["governing_law"])
        self.assertEqual(result["usage"]["cached_input_tokens"], 512)

    def test_cost_estimate_is_zero_for_rules_and_positive_for_models(self):
        self.assertEqual(estimate_cost("rules_v2", TEXT), 0)
        self.assertGreater(estimate_cost("openai", TEXT), 0)
        self.assertGreater(estimate_cost("anthropic", TEXT), estimate_cost("openai", TEXT))


if __name__ == "__main__":
    unittest.main()
