class MockProvider:
    name = "mock"

    def complete(self, prompt, context):
        score = context["tools"]["priority_scorer"]["score"]
        band = context["tools"]["priority_scorer"]["band"]

        return {
            "summary": "Focus on the highest-leverage decision, reduce ambiguity quickly, and convert the situation into a few concrete actions.",
            "priorities": [
                {
                    "title": "Clarify the real decision",
                    "why": "The prompt mixes goals and tradeoffs. A sharper decision frame will make the next step easier.",
                    "score": score,
                },
                {
                    "title": "Timebox research",
                    "why": "A short research window prevents open-ended analysis while still improving confidence.",
                    "score": max(1, score - 12),
                },
                {
                    "title": "Protect learning momentum",
                    "why": "A demoable output creates learning momentum and gives you something to share or evaluate.",
                    "score": max(1, score - 20),
                },
            ],
            "risks": [
                {
                    "risk": "Over-researching before making a reversible next move.",
                    "mitigation": "Set a 45-minute research cap and write down the decision criteria before searching.",
                },
                {
                    "risk": "Optimizing for novelty instead of usefulness.",
                    "mitigation": "Make the output helpful to a real user in a two-minute demo.",
                },
            ],
            "next_actions": [
                {"action": "Write the decision in one sentence.", "timebox": "10 minutes"},
                {"action": "List three success criteria and three constraints.", "timebox": "20 minutes"},
                {"action": "Pick one action that creates visible progress today.", "timebox": "30 minutes"},
            ],
            "questions": [
                "What would make this decision obviously successful 30 days from now?",
                "Which constraint is real, and which one is just uncertainty?",
                f"Does the {band} priority score match your gut feel?",
            ],
            "confidence": 0.72,
            "tool_results": context["tools"],
        }
