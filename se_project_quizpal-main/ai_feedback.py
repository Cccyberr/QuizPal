# backend/ai_feedback.py
# Simple rule-based feedback. Replace or extend with model/LLM integration.

def generate_feedback(answers):
    if not answers:
        return {"summary": "No answers provided", "tips": []}
    total = len(answers)
    correct = sum(1 for a in answers if str(a.get("user_answer")) == str(a.get("correct_answer")))
    accuracy = correct / total if total else 0

    by_cat = {}
    for a in answers:
        cat = a.get("category", "General")
        by_cat.setdefault(cat, {"total": 0, "wrong": 0})
        by_cat[cat]["total"] += 1
        if str(a.get("user_answer")) != str(a.get("correct_answer")):
            by_cat[cat]["wrong"] += 1

    tips = []
    for cat, stats in by_cat.items():
        pct_wrong = stats["wrong"] / stats["total"] if stats["total"] else 0
        if pct_wrong > 0.4:
            tips.append({"topic": cat, "advice": f"Spend more time on {cat}. Try step-by-step fundamentals."})
        elif pct_wrong > 0.15:
            tips.append({"topic": cat, "advice": f"Practice 5 targeted questions in {cat}."})

    summary = f"You answered {correct}/{total} correctly (accuracy {accuracy:.0%})."
    return {"summary": summary, "tips": tips}
