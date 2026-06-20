# fetch_questions.py
import os
import re
import json
import time
import random
import logging
from sqlalchemy import inspect, text
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

from app import app, db, Question

# ---------- config ----------
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
NAV_TIMEOUT = 60_000
PAGE_WAIT_MS = 500
DIFFICULTY_QUOTA = {"easy": 10, "medium": 10, "hard": 10}
DEBUG_DIR = "debug_containers"
os.makedirs(DEBUG_DIR, exist_ok=True)
HEADLESS = True
RETRY_GOTO = 3
BATCH_COMMIT_SIZE = 20

INDIABIX_CATEGORIES = {
    "aptitude": [
        "https://www.indiabix.com/aptitude/percentage/",
        "https://www.indiabix.com/aptitude/time-and-work/",
        "https://www.indiabix.com/aptitude/profit-and-loss/",
        "https://www.indiabix.com/aptitude/compound-interest/",
    ],
    "verbal": [
        "https://www.indiabix.com/verbal-ability/synonyms/",
        "https://www.indiabix.com/verbal-ability/antonyms/",
        "https://www.indiabix.com/verbal-ability/spotting-errors/",
    ],
    "technical": [
        "https://www.indiabix.com/computer-science/computer-fundamentals/",
        "https://www.indiabix.com/computer-science/networking/",
        "https://www.indiabix.com/computer-science/software-engineering/",
    ],
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


# ---------- DB helpers ----------
def ensure_table_columns():
    """Ensure common columns exist (difficulty, source_url, correct_index)."""
    with app.app_context():
        db.create_all()
        insp = inspect(db.engine)
        if "question" not in insp.get_table_names():
            db.create_all()
            insp = inspect(db.engine)
        cols = [c["name"] for c in insp.get_columns("question")]
        stmts = []
        if "difficulty" not in cols:
            stmts.append("ALTER TABLE question ADD COLUMN difficulty VARCHAR(20) DEFAULT 'medium'")
        if "source_url" not in cols:
            stmts.append("ALTER TABLE question ADD COLUMN source_url VARCHAR(255)")
        if "correct_index" not in cols:
            stmts.append("ALTER TABLE question ADD COLUMN correct_index INTEGER")
        for s in stmts:
            try:
                with db.engine.begin() as conn:
                    conn.execute(text(s))
                logging.info("DB schema updated: %s", s)
            except Exception as e:
                logging.warning("Could not run schema change (%s): %s", s, e)


def clear_db():
    with app.app_context():
        try:
            deleted = Question.query.delete()
            db.session.commit()
            logging.info("Deleted %d existing questions.", deleted)
        except Exception:
            db.session.rollback()
            logging.exception("Failed clearing DB.")


# ---------- debug ----------
def save_debug(tag, text_content, html_content):
    safe_tag = re.sub(r"[^0-9A-Za-z_\-\.]", "_", str(tag))[:120]
    txt_path = os.path.join(DEBUG_DIR, f"{safe_tag}.txt")
    html_path = os.path.join(DEBUG_DIR, f"{safe_tag}.html")
    try:
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text_content or "")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content or "")
        logging.info("Saved debug files: %s, %s", txt_path, html_path)
    except Exception:
        logging.exception("Couldn't save debug files")


def norm(s):
    if not s:
        return ""
    return re.sub(r"\s+", " ", s).strip()


# ---------- extraction ----------
def try_get_qid(container):
    """Try to find numeric id used by Indiabix (divQuestion_NNN or link to divAnswer_NNN)."""
    try:
        cid = container.get_attribute("id") or ""
        m = re.search(r"divQuestion_(\d+)", cid)
        if m:
            return m.group(1)
        # anchors inside container linking to answer
        for a in container.query_selector_all("a"):
            try:
                href = a.get_attribute("href") or ""
                m2 = re.search(r"#divAnswer_(\d+)", href)
                if m2:
                    return m2.group(1)
            except Exception:
                continue
    except Exception:
        pass
    return None


def try_click_reveal(container, page):
    """Try several buttons/links to reveal answer block on the page."""
    selectors = [
        ".bix-ans-show", ".bix-ans-btn", ".show-answer",
        "a[title*='Show']", "a[href*='#answer']", "a:has-text('Show Answer')"
    ]
    for sel in selectors:
        try:
            btn = container.query_selector(sel)
            if btn:
                try:
                    btn.click()
                    page.wait_for_timeout(150)
                    return True
                except Exception:
                    try:
                        # fallback to evaluate click
                        container.evaluate("el => { const b = el.querySelector(arguments[0]); if(b) b.click(); }", sel)
                        page.wait_for_timeout(150)
                        return True
                    except Exception:
                        continue
        except Exception:
            continue
    # try clicking any anchor with 'answer'/'show' text
    try:
        for a in container.query_selector_all("a"):
            try:
                txt = (a.inner_text() or "").lower()
                if "answer" in txt or "show" in txt:
                    a.click()
                    page.wait_for_timeout(150)
                    return True
            except Exception:
                continue
    except Exception:
        pass
    return False


def extract_from_container(container, page, tag):
    """
    Return: dict { qtext, options(list4), answer, correctIndex } or None.
    Saves debug HTML/text on failure.
    """
    try:
        html = container.evaluate("el => el.outerHTML") or ""
        raw = container.inner_text() or ""
        qid = try_get_qid(container)

        # prefer explicit qtext nodes
        qnode = None
        for sel in [".bix-td-qtxt", ".bix-qtxt", ".bix-ques", ".bix-question", ".qtext", ".question"]:
            try:
                qnode = container.query_selector(sel)
            except Exception:
                qnode = None
            if qnode:
                break

        if qnode:
            qtext = norm(qnode.inner_text() or "")
        else:
            # fallback to first non-empty line
            lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
            qtext = norm(lines[0]) if lines else ""
        if not qtext:
            save_debug(f"no_qtext_{tag}", raw, html)
            return None

        # Collect option nodes via multiple selectors
        opts = []
        selectors = [
            ".bix-td-option", ".bix-options li", ".bix-opts li", ".bix-options td", ".bix-options span",
            ".bix-td-option label", "label", "li"
        ]
        for sel in selectors:
            try:
                nodes = container.query_selector_all(sel)
            except Exception:
                nodes = []
            if nodes and len(nodes) >= 2:
                for n in nodes:
                    try:
                        t = norm(n.inner_text() or "")
                        if not t:
                            continue
                        # strip leading 'A.' / '1)' etc
                        t = re.sub(r'^[A-Da-d]\s*[\.\)]\s*', '', t)
                        t = re.sub(r'^[1-4]\s*[\.\)]\s*', '', t)
                        # if option repeats question text, remove prefix equal to qtext
                        if qtext and t.lower().startswith(qtext.lower()):
                            t = t[len(qtext):].strip(" -:.)\n\t")
                        if t and t.lower() != qtext.lower() and t not in opts:
                            opts.append(t)
                    except Exception:
                        continue
                if len(opts) >= 4:
                    break

        # fallback: parse li tags from html
        if len(opts) < 4:
            li_matches = re.findall(r"<li[^>]*>(.*?)</li>", html, flags=re.I | re.S)
            for li in li_matches:
                clean = norm(re.sub(r"<[^>]+>", "", li))
                clean = re.sub(r'^[A-Da-d]\s*[\.\)]\s*', '', clean)
                if clean and clean not in opts and clean.lower() != qtext.lower():
                    opts.append(clean)
                if len(opts) >= 4:
                    break

        # fallback: take subsequent text lines
        if len(opts) < 4:
            lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
            candidates = []
            for ln in lines[1:]:
                if re.match(r"^(Answer|Explanation|Solution)\b", ln, re.I):
                    continue
                ln2 = re.sub(r'^[A-Da-d]\s*[\.\)]\s*', '', ln)
                ln2 = re.sub(r'^[1-4]\s*[\.\)]\s*', '', ln2)
                if qtext and ln2.lower().startswith(qtext.lower()):
                    ln2 = ln2[len(qtext):].strip(" -:.)\n\t")
                if ln2 and ln2.lower() != qtext.lower() and ln2 not in opts:
                    candidates.append(ln2)
            for c in candidates:
                opts.append(norm(c))
                if len(opts) >= 4:
                    break

        # final clean / handle single-line that contains all options
        opts = [norm(o) for o in opts if o and norm(o)]
        if len(opts) == 1 and len(opts[0]) > 80:
            # try to split by double space, tabs, pipes, semicolons or sequence of option labels
            parts = re.split(r'\s{2,}|\t|\||;|(?=[A-D]\s*\.)', opts[0])
            parts = [norm(re.sub(r'^[A-Da-d]\s*[\.\)]\s*', '', p)) for p in parts if norm(p)]
            if len(parts) >= 4:
                opts = parts[:4]

        if len(opts) < 4:
            save_debug(f"opts_few_{tag}", raw, html)
            return None

        opts = opts[:4]

        # try to reveal answer block (if hidden)
        try_click_reveal(container, page)

        # authoritative answer: check #divAnswer_<qid> on page if we have id
        answer_text = ""
        correct_index = None
        if qid:
            try:
                ans_block = page.query_selector(f"#divAnswer_{qid}")
                if ans_block:
                    answer_text = norm(ans_block.inner_text() or "")
                    # sometimes answer text is like "Answer: Option D" or "Answer : Option D"
                    m = re.search(r"(?:Answer|Ans|Correct)\s*[:\-]?\s*(?:Option\s*)?([A-D1-4])", answer_text, re.I)
                    if m:
                        token = m.group(1).upper()
                        correct_index = int(token) - 1 if token.isdigit() else (ord(token) - ord("A"))
                    else:
                        # else extract first letter option from block
                        m2 = re.search(r"\b([A-D])\b", answer_text)
                        if m2:
                            correct_index = ord(m2.group(1)) - ord("A")
            except Exception:
                pass

        # fallback: find Answer: inside container raw text
        if correct_index is None and not answer_text:
            m = re.search(r"(?:Answer|Ans|Correct)\s*[:\-]?\s*(?:Option\s*)?([A-D1-4])", raw, re.I)
            if m:
                token = m.group(1).upper()
                correct_index = int(token) - 1 if token.isdigit() else (ord(token) - ord("A"))
                if 0 <= correct_index < 4:
                    answer_text = opts[correct_index]
            else:
                m2 = re.search(r"(?:Answer|Ans|Correct)\s*[:\-]?\s*([^\n\r]{1,120})", raw, re.I)
                if m2:
                    answer_text = norm(m2.group(1))

        # map textual answer to index
        if correct_index is None and answer_text:
            # strip "Option X" prefix
            cleaned = re.sub(r"^Option\s*[A-D1-4]\s*[:\.\)]?\s*", "", answer_text, flags=re.I)
            cleaned = norm(cleaned).lower()
            for i, o in enumerate(opts):
                if norm(o).lower() == cleaned:
                    correct_index = i
                    break
            if correct_index is None:
                for i, o in enumerate(opts):
                    if cleaned and (cleaned in o.lower() or o.lower() in cleaned):
                        correct_index = i
                        break

        if correct_index is not None and not (0 <= correct_index < 4):
            correct_index = None

        return {
            "qtext": qtext,
            "options": opts,
            "answer": answer_text or "",
            "correctIndex": correct_index,
            "qid": qid,
            "html": html,
        }

    except Exception:
        try:
            raw = container.inner_text() or ""
            html = container.evaluate("el => el.outerHTML") or ""
            save_debug(f"exception_{tag}", raw, html)
        except Exception:
            pass
        logging.exception("extract_from_container failed")
        return None


# ---------- navigation ----------
def safe_goto(page, url):
    delay = 1.0
    for attempt in range(1, RETRY_GOTO + 1):
        try:
            logging.info("Loading %s (attempt %d/%d)", url, attempt, RETRY_GOTO)
            page.goto(url, timeout=NAV_TIMEOUT, wait_until="domcontentloaded")
            page.wait_for_timeout(PAGE_WAIT_MS)
            return True
        except PlaywrightTimeoutError:
            logging.warning("Timeout loading %s (attempt %d)", url, attempt)
            time.sleep(delay)
            delay *= 2
        except Exception:
            logging.exception("Error loading %s", url)
            time.sleep(delay)
            delay *= 2
    return False


# ---------- main ----------
def fetch_and_store():
    ensure_table_columns()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)
        context = browser.new_context(user_agent=USER_AGENT)
        page = context.new_page()

        with app.app_context():
            # optional: clear DB before insert
            clear_db()

            total_inserted = 0
            for category, urls in INDIABIX_CATEGORIES.items():
                logging.info("Fetching category: %s", category)
                collected = {}

                for url in urls:
                    if not safe_goto(page, url):
                        continue

                    page.wait_for_timeout(PAGE_WAIT_MS)
                    containers = page.query_selector_all(".bix-div-container")
                    logging.info("Found %d containers on %s", len(containers), url)

                    for i, c in enumerate(containers, start=1):
                        tag = f"{category}_{url.split('/')[-2]}_{i}"
                        # try to reveal answer inside container
                        try_click_reveal(c, page)

                        res = extract_from_container(c, page, tag)
                        if not res:
                            continue
                        key = res["qtext"][:300]
                        if key not in collected:
                            collected[key] = res

                items = list(collected.values())
                random.shuffle(items)

                easy = items[:DIFFICULTY_QUOTA["easy"]]
                medium = items[DIFFICULTY_QUOTA["easy"]: DIFFICULTY_QUOTA["easy"] + DIFFICULTY_QUOTA["medium"]]
                hard = items[DIFFICULTY_QUOTA["easy"] + DIFFICULTY_QUOTA["medium"]:
                             DIFFICULTY_QUOTA["easy"] + DIFFICULTY_QUOTA["medium"] + DIFFICULTY_QUOTA["hard"]]

                inserted = 0
                batch = 0
                for diff, group in [("easy", easy), ("medium", medium), ("hard", hard)]:
                    for q in group:
                        try:
                            # skip duplicates in DB by qtext
                            if Question.query.filter(Question.qtext == q["qtext"]).first():
                                continue
                            new_q = Question()
                            new_q.category = category
                            new_q.qtext = q["qtext"]
                            try:
                                new_q.options_json = json.dumps(q["options"], ensure_ascii=False)
                            except Exception:
                                new_q.options_json = "[]"
                            new_q.answer = q.get("answer", "") or ""
                            if hasattr(new_q, "difficulty"):
                                new_q.difficulty = diff
                            if hasattr(new_q, "source_url"):
                                try:
                                    new_q.source_url = "Indiabix"
                                except Exception:
                                    pass
                            if hasattr(new_q, "correct_index"):
                                try:
                                    new_q.correct_index = int(q["correctIndex"]) if q.get("correctIndex") is not None else None
                                except Exception:
                                    new_q.correct_index = None

                            db.session.add(new_q)
                            inserted += 1
                            batch += 1
                            total_inserted += 1
                            if batch >= BATCH_COMMIT_SIZE:
                                db.session.commit()
                                batch = 0
                        except Exception:
                            logging.exception("DB add error, skipping question")

                # commit remaining
                try:
                    db.session.commit()
                except Exception:
                    logging.exception("Commit failed, rolling back")
                    db.session.rollback()

                logging.info("Inserted %d questions for %s (total so far %d)", inserted, category, total_inserted)

            logging.info("All done. Total inserted: %d", total_inserted)
        browser.close()


if __name__ == "__main__":
    fetch_and_store()
