# fetch_questions.py
import requests, time, json
from bs4 import BeautifulSoup
from app import app
from models import db, Question

CATEGORY_URLS = {
    "aptitude": "https://www.indiabix.com/aptitude/questions-and-answers/",
    "verbal": "https://www.indiabix.com/verbal-ability/questions-and-answers/",
    "technical": "https://www.indiabix.com/technical/questions-and-answers/",
}

HEADERS = {"User-Agent": "QuizPalBot/1.0 (for learning project)"}

def parse_questions(url, category):
    print(f"Fetching {category} questions from {url}...")
    res = requests.get(url, headers=HEADERS, timeout=10)
    soup = BeautifulSoup(res.text, "html.parser")
    blocks = soup.select(".bix-div-container")
    questions = []

    for b in blocks[:20]:  # limit per category
        qtext = b.select_one(".bix-td-qtxt")
        if not qtext: continue
        qtext = qtext.get_text(strip=True)

        options = [opt.get_text(strip=True) for opt in b.select(".bix-td-option .bix-td-option-txt")]
        ans_node = b.select_one(".jq-hdnakqb")
        answer = ans_node.get_text(strip=True) if ans_node else None

        questions.append({
            "category": category,
            "qtext": qtext,
            "options": options,
            "answer": answer,
            "source_url": url
        })
    return questions

def store_questions(qs):
    count = 0
    for q in qs:
        exists = Question.query.filter_by(qtext=q["qtext"]).first()
        if not exists:
            item = Question(
                category=q["category"],
                qtext=q["qtext"],
                options=json.dumps(q["options"]),
                answer=q["answer"],
                source_url=q["source_url"],
                last_updated=time.time()
            )
            db.session.add(item)
            count += 1
    db.session.commit()
    return count

if __name__ == "__main__":
    with app.app_context():
        total = 0
        for cat, url in CATEGORY_URLS.items():
            qs = parse_questions(url, cat)
            total += store_questions(qs)
        print(f"✅ Inserted {total} new questions into DB")
