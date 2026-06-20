# fix_fetched_questions.py
"""
Post-process scraped questions:
 - Normalize options (split if first option contains multiple items)
 - Remove question text accidentally placed into options
 - Extract correct_index from answer text (e.g. "Answer: Option C" or "Answer: Rs. 2.04")
 - Write corrections back to DB (only updates rows that look broken)
Usage: python fix_fetched_questions.py
"""

import re
import json
import logging
from difflib import SequenceMatcher
from app import app, db, Question

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def norm(s):
    if s is None:
        return ""
    # normalize spaces and lowercase
    return re.sub(r'\s+', ' ', str(s)).strip().lower()


def candidate_similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()


def split_combined_option(opt_text):
    """
    Heuristic: if a single option string contains multiple options, try splitting.
    Splitting separators: two+ spaces, tabs, '  ' , '  ' , '|', ';', newline.
    Also try splitting on sequences of digits with punctuation if that looks like "1. option 2. option".
    """
    if not opt_text or len(opt_text) < 30:
        return None
    # try separators
    parts = re.split(r'\s{2,}|\t|\n|\||;|(?<=\.)\s+(?=[A-Z0-9])', opt_text)
    parts = [p.strip() for p in parts if p.strip()]
    # If still looks like "opt1 opt2 opt3 opt4" with numbers/letters, try regex for labels
    if len(parts) < 4:
        lbl_parts = re.split(r'(?:(?<=\b)[A-D]\.|\b[1-4]\.|[A-D]\))', opt_text)
        lbl_parts = [p.strip() for p in lbl_parts if p.strip()]
        if len(lbl_parts) >= 4:
            parts = lbl_parts
    if len(parts) >= 4:
        return parts[:4]
    return None


def extract_letter_from_answer(ans):
    """Return 0-based index if answer contains Option A/B/C/D or numeric 1-4."""
    if not ans:
        return None
    m = re.search(r'(?:option\s*)?([A-D]|[1-4])', ans, re.I)
    if m:
        token = m.group(1)
        if token.isdigit():
            idx = int(token) - 1
            if 0 <= idx <= 3:
                return idx
        else:
            letter = token.upper()
            if 'A' <= letter <= 'D':
                return ord(letter) - ord('A')
    return None


def pick_index_by_text_match(ans_text, opts):
    """
    Try to map answer text to index using exact/loose matching.
    Returns index or None.
    """
    if not ans_text:
        return None
    ans_norm = re.sub(r'^(?:option\s*[A-D1-4][\.\)]?\s*)', '', ans_text, flags=re.I).strip()
    if not ans_norm:
        return None
    # exact normalized match
    for i, o in enumerate(opts):
        if norm(o) == norm(ans_norm):
            return i
    # substring / fuzzy
    best = None
    best_score = 0.0
    for i, o in enumerate(opts):
        s = candidate_similarity(norm(o), norm(ans_norm))
        if s > best_score:
            best_score = s
            best = i
    if best_score >= 0.6:
        return best
    # as last resort, check if ans contains the option text as substring
    for i, o in enumerate(opts):
        if norm(o) and norm(o) in norm(ans_norm):
            return i
    return None


def clean_options_from_lines(qtext, opts):
    """
    Remove options that accidentally include full question text or are malformed.
    If first option appears to be long and contains qtext, drop the qtext part.
    """
    cleaned = []
    ql = norm(qtext)
    for o in opts:
        o_norm = o.strip()
        # remove accidental repeated qtext inside option
        if ql and ql in norm(o_norm) and len(o_norm) > len(qtext) + 10:
            # remove qtext substring
            cleaned_candidate = re.sub(re.escape(qtext), '', o_norm, flags=re.I).strip()
            if cleaned_candidate:
                o_norm = cleaned_candidate
        # remove leading "1. " or "A) " etc
        o_norm = re.sub(r'^[A-Da-d]\s*[\.\)]\s*', '', o_norm)
        o_norm = re.sub(r'^[1-4]\s*[\.\)]\s*', '', o_norm)
        cleaned.append(o_norm)
    return cleaned


def process_question_row(q):
    """
    Returns tuple (changed_bool, message)
    """
    changed = False
    msg = ""

    # Load options from either options_json or options attribute
    options = []
    if hasattr(q, "options_json") and q.options_json:
        try:
            options = json.loads(q.options_json)
            if not isinstance(options, list):
                options = []
        except Exception:
            # fallback parse as string: split on newline or '|' if needed
            options = [s.strip() for s in str(q.options_json).splitlines() if s.strip()]
    elif hasattr(q, "options") and q.options:
        options = q.options if isinstance(q.options, list) else [str(q.options)]
    else:
        options = []

    # qtext
    qtext = getattr(q, "qtext", "") or ""

    # If options missing or first option contains question text / or options length >4 or first option is long combined block
    if len(options) == 0:
        msg += "no options; skipped. "
        return False, msg

    # If options look like first entry contains many options concatenated, attempt split
    if len(options) == 1:
        sp = split_combined_option(options[0])
        if sp:
            options = sp
            changed = True
            msg += "split combined first-option into 4. "

    # If any option contains whole qtext (accidentally included), remove qtext chunk
    cleaned = clean_options_from_lines(qtext, options)
    if cleaned != options:
        options = cleaned
        changed = True
        msg += "cleaned repeated qtext from options. "

    # If still more than 4, try to reduce by taking last 4 or trying to find items that are short
    if len(options) > 4:
        # prefer those that are shorter and look like options (avoid ones containing long explanation)
        candidates = [o for o in options if len(o) < 200]
        if len(candidates) >= 4:
            options = candidates[:4]
            changed = True
            msg += "trimmed options to first 4 short items. "
        else:
            options = options[:4]
            changed = True
            msg += "trimmed options to first 4. "

    # If fewer than 4 after cleaning, cannot proceed
    if len(options) < 4:
        msg += f"not enough options ({len(options)}). "
        return changed, msg

    # store normalized options back
    new_options_json = json.dumps(options, ensure_ascii=False)
    if getattr(q, "options_json", None) != new_options_json:
        # set attribute
        if hasattr(q, "options_json"):
            q.options_json = new_options_json
            changed = True
            msg += "updated options_json. "

    # Determine correct_index if missing or null-ish
    current_idx = getattr(q, "correct_index", None) if hasattr(q, "correct_index") else None

    # answer text might be stored in q.answer
    answer_text = getattr(q, "answer", "") or ""
    # also check if answer_text contains long "Answer: Option ... Explanation:" pattern (strip Explanation)
    # Strip text after "Explanation" or "Video" or "Solution" to avoid noise
    answer_text_clean = re.split(r'\bExplanation\b|\bVideo\b|\bSolution\b', answer_text, flags=re.I)[0].strip()

    # 1) if correct_index already present and valid, keep
    if isinstance(current_idx, int) and 0 <= current_idx < 4:
        msg += f"already has correct_index={current_idx}. "
    else:
        # Try to get letter like A/B/1-4
        idx_from_letter = extract_letter_from_answer(answer_text_clean)
        if idx_from_letter is not None:
            q.correct_index = idx_from_letter
            changed = True
            msg += f"set correct_index from letter -> {idx_from_letter}. "
        else:
            # Try to match answer text to option text
            idx_from_text = pick_index_by_text_match(answer_text_clean, options)
            if idx_from_text is not None:
                q.correct_index = idx_from_text
                changed = True
                msg += f"mapped answer text to index {idx_from_text}. "
            else:
                # As fallback, try to look for any option fully contained in answer_text_clean
                found = None
                for i, o in enumerate(options):
                    if norm(o) and norm(o) in norm(answer_text_clean):
                        found = i
                        break
                if found is not None:
                    q.correct_index = found
                    changed = True
                    msg += f"found substring mapping -> {found}. "
                else:
                    msg += "could not determine correct_index. "

    # write back difficulty if missing default medium
    if hasattr(q, "difficulty"):
        if getattr(q, "difficulty") in (None, "", "null"):
            q.difficulty = "medium"
            changed = True
            msg += "set difficulty=medium. "

    return changed, msg


def main():
    with app.app_context():
        # process only recent questions or all - we will target rows with null correct_index or bad options
        rows = Question.query.order_by(Question.id.desc()).limit(1000).all()
        # you can change filter to get all: Question.query.all()
        total = len(rows)
        logging.info("Processing %d questions (limited to 1000).", total)
        changed_count = 0
        skipped = 0

        for q in rows:
            # Only try to repair those with clearly broken state OR attempt best-effort on all
            # Condition: correct_index is None or options_json messy
            try:
                ok = False
                if (hasattr(q, "correct_index") and (q.correct_index is None)):
                    ok = True
                # also if options_json missing or not list of length 4
                opts = []
                if hasattr(q, "options_json") and q.options_json:
                    try:
                        opts = json.loads(q.options_json)
                    except Exception:
                        opts = []
                if len(opts) != 4:
                    ok = True

                if not ok:
                    skipped += 1
                    continue

                changed, msg = process_question_row(q)
                if changed:
                    try:
                        db.session.add(q)
                        db.session.commit()
                        changed_count += 1
                        logging.info("Updated Q(id=%s): %s", getattr(q, "id", "?"), msg)
                    except Exception as e:
                        logging.exception("DB commit failed for id=%s: %s", getattr(q, "id", "?"), e)
                        db.session.rollback()
                else:
                    logging.debug("No change for Q(id=%s): %s", getattr(q, "id", "?"), msg)

            except Exception as e:
                logging.exception("Failed processing q.id=%s : %s", getattr(q, "id", "?"), e)

        logging.info("Done. changed=%d skipped=%d out_of=%d", changed_count, skipped, total)


if __name__ == "__main__":
    main()
