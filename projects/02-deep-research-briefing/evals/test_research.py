import unittest

from app.research import mock_brief, normalize, prepare, prompt_for


SOURCES = [
    {"title": "Team notes", "url": "https://example.com/notes", "note": "The team chose a narrow prototype after comparing two options. The demo took one day."},
    {"title": "Retrospective", "url": "", "note": "A broad prototype was hard to evaluate. The narrow prototype generated specific feedback."},
]


class ResearchTests(unittest.TestCase):
    def test_mock_brief_cites_only_supplied_sources(self):
        context = prepare("Which project should the team build next?", SOURCES)
        result = normalize(mock_brief(context), context)
        self.assertEqual(result["source_audit"]["source_count"], 2)
        self.assertEqual(result["critique"]["confidence"], "low")
        self.assertEqual([row["source_ids"] for row in result["findings"]], [["S1"], ["S2"]])

    def test_invalid_citations_are_removed(self):
        context = prepare("Which project should the team build next?", SOURCES)
        raw = {"answer": "Maybe narrow", "findings": [{"claim": "Supported", "source_ids": ["S1", "S9"]}, {"claim": "Unsupported", "source_ids": ["S9"]}]}
        result = normalize(raw, context)
        self.assertEqual(result["findings"], [{"claim": "Supported", "source_ids": ["S1"]}])

    def test_requires_sources_and_substantive_notes(self):
        with self.assertRaises(ValueError):
            prepare("Which project should the team build next?", [])
        with self.assertRaises(ValueError):
            prepare("Which project should the team build next?", [{"title": "Thin", "note": "Too short"}])

    def test_cost_limit_rejects_oversized_source_packet(self):
        sources = [{"title": f"Source {index}", "note": "x" * 4600} for index in range(4)]
        with self.assertRaisesRegex(ValueError, "18,000"):
            prepare("Which project should the team build next?", sources)

    def test_reusable_source_packet_precedes_question(self):
        context = prepare("Which project should the team build next?", SOURCES)
        prompt = prompt_for(context)
        self.assertLess(prompt.index("Source packet:"), prompt.index("Research question:"))
        self.assertLess(prompt.index("The team chose a narrow prototype"), prompt.index(context["question"]))


if __name__ == "__main__":
    unittest.main()
