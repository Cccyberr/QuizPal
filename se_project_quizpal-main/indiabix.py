# backend/integrations/indiabix.py
import os, time, json, re
from urllib.parse import urljoin, urlparse, urlunparse
import requests
from requests.adapters import HTTPAdapter, Retry
from bs4 import BeautifulSoup
from cache import get_cache, set_cache

DEFAULT_DELAY = float(os.environ.get("INDIABIX_DELAY", "0.35"))
DEFAULT_TIMEOUT = int(os.environ.get("INDIABIX_TIMEOUT", "12"))
MAX_PAGES_PER_TOPIC = int(os.environ.get("MAX_PAGES_PER_TOPIC", "60"))
MAX_TOTAL_REQUESTS = int(os.environ.get("MAX_TOTAL_REQUESTS", "180"))

HEADERS = {"User-Agent": "QuizPalBot/1.0 (+your-email@example.com)"}
_session = requests.Session()
_retries = Retry(total=3, backoff_factor=0.6, status_forcelist=(429,500,502,503,504))
_session.mount("https://", HTTPAdapter(max_retries=_retries))
_session.mount("http://", HTTPAdapter(max_retries=_retries))

TOPIC_MAP = {
    "aptitude": {
        "easy": [
            "https://www.indiabix.com/aptitude/ratio-and-proportion/",
            "https://www.indiabix.com/aptitude/time-and-work/"
        ],
        "medium": [
            "https://www.indiabix.com/aptitude/problems-on-trains/",
            "https://www.indiabix.com/aptitude/boats-and-streams/"
        ],
        "hard": [
            "https://www.indiabix.com/aptitude/permutations-and-combinations/",
            "https://www.indiabix.com/aptitude/probability/"
        ]
    },
    "technical": {
        "easy": [
            "https://www.indiabix.com/technical/c-programming/",
            "https://www.indiabix.com/technical/data-structures/"
        ],
        "medium": [
            "https://www.indiabix.com/technical/operating-systems/",
            "https://www.indiabix.com/technical/dbms/"
        ],
        "hard": [
            "https://www.indiabix.com/technical/algorithms/",
            "https://www.indiabix.com/technical/computer-networking/"
        ]
    },
    "verbal": {
        "easy": [
            "https://www.indiabix.com/verbal-reasoning/spot-the-error/",
            "https://www.indiabix.com/verbal-reasoning/sentence-completion/"
        ],
        "medium": [
            "https://www.indiabix.com/verbal-reasoning/synonyms-antonyms/",
            "https://www.indiabix.com/verbal-reasoning/para-jumbles/"
        ],
        "hard": [
            "https://www.indiabix.com/verbal-reasoning/reading-comprehension/",
            "https://www.indiabix.com/verbal-reasoning/critical-reasoning/"
        ]
    }
}

def _get_page(url, timeout=DEFAULT_TIMEOUT):
    print(f"[indiabix] GET {url} (timeout={timeout}s)")
    r = _session.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.text

def _normalize_url(u):
    p = urlparse(u)
    p = p._replace(fragment="")
    norm = urlunparse(p)
    if norm.endswith("/") and len(norm) > len("https://"):
        norm = norm[:-1]
    return norm

def _get_internal_links(html, base_url, include_keyword=None):
    soup = BeautifulSoup(html, "html.parser")
    links = []
    seen = set()
    for a in soup.select("a[href]"):
        href = a.get("href") or ""
        if not href:
            continue
        if href.startswith("javascript:") or href.startswith("mailto:") or href.startswith("tel:") or href.startswith("#"):
            continue
        full = urljoin(base_url, href)
        norm = _normalize_url(full)
        if "indiabix.com" not in norm:
            continue
        if include_keyword and include_keyword not in norm and "/aptitude/" not in norm and "/technical/" not in norm and "/verbal-reasoning/" not in norm:
            continue
        if norm not in seen:
            seen.add(norm)
            links.append(norm)
    return links

def is_valid_mcq(options):
    if not options or not isinstance(options, list):
        return False
    n = len(options)
    if n < 2 or n > 6:
        return False
    lengths = [len(str(o).strip()) for o in options]
    avg_len = sum(lengths) / len(lengths)
    if avg_len > 100:
        return False
    bad_words = ("aptitude","engineering","test","questions","answers","practice","section")
    lower_opts = [str(o).lower() for o in options]
    if all(any(bw in opt for bw in bad_words) for opt in lower_opts):
        return False
    if len(set(lower_opts)) < max(1, n // 2):
        return False
    return True

def _parse_question_page(html, base_url):
    soup = BeautifulSoup(html, "html.parser")
    q_el = (soup.select_one(".bix-td-question .bix-td-qtxt") or soup.select_one(".bix-td-qtxt") or soup.select_one(".question") or soup.select_one("h1") or soup.select_one("h2"))
    question = q_el.get_text(separator=" ", strip=True) if q_el else ""
    options = []
    candidates = [".bix-ans-options li", ".bix-ans li", ".bix-answers li", ".options li", ".options label", ".bix-ans-choices li", "ul li", "ol li", "label"]
    for sel in candidates:
        for o in soup.select(sel):
            txt = o.get_text(separator=" ", strip=True)
            if not txt:
                continue
            txt = re.sub(r'^[A-D]\s*[\).:-]\s*', '', txt, flags=re.I)
            if txt and txt not in options:
                options.append(txt)
        if options:
            break
    if not options:
        text = soup.get_text("\n", strip=True)
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        candidate_block = []
        for ln in lines:
            if 1 <= len(ln) <= 140 and len(ln.split()) <= 18:
                candidate_block.append(ln)
            else:
                if 2 <= len(candidate_block) <= 6:
                    options = candidate_block.copy()
                    break
                candidate_block = []
        if not options and 2 <= len(candidate_block) <= 6:
            options = candidate_block.copy()
    correct = ""
    try:
        answer_el = soup.select_one(".bix-ans-right") or soup.select_one(".answer") or soup.find(string=lambda s: s and "Answer" in s)
        if answer_el:
            if hasattr(answer_el, "get_text"):
                correct = answer_el.get_text(separator=" ", strip=True)
            else:
                correct = str(answer_el).strip()
            if correct.lower().startswith("answer"):
                parts = correct.split(":")
                if len(parts) >= 2:
                    correct = parts[1].strip()
            correct = re.sub(r'^[A-D]\s*[\).:-]\s*', '', correct, flags=re.I)
    except Exception:
        correct = ""
    expl = (soup.select_one(".explain") or soup.select_one(".bix-ans-exp") or soup.select_one(".bix-ans-expl") or soup.select_one(".explanation"))
    explanation = expl.get_text(separator=" ", strip=True) if expl else ""
    if not is_valid_mcq(options):
        return {"question": question or "", "options": [], "correct_answer": "", "explanation": explanation, "source": base_url}
    return {"question": question, "options": options, "correct_answer": correct, "explanation": explanation, "source": base_url}

def fetch_india_questions(topic_url=None, difficulty="easy", amount=10, category="aptitude", delay=None):
    category = (category or "aptitude").strip().lower()
    allowed = {"technical","aptitude","verbal"}
    if category not in allowed:
        print(f"[indiabix] category '{category}' not allowed -> defaulting to 'aptitude'")
        category = "aptitude"
    difficulty = (difficulty or "easy").strip().lower()
    delay = DEFAULT_DELAY if delay is None else float(delay)
    cache_key = f"indiabix:{topic_url or category}:{difficulty}:{amount}"
    cached = get_cache(cache_key)
    if cached:
        print(f"[indiabix] using cached questions for {cache_key} (count={len(cached)})")
        return cached
    topic_urls = [topic_url] if topic_url else TOPIC_MAP.get(category, {}).get(difficulty, [])
    if not topic_urls:
        print(f"[indiabix] no topic urls for category={category} difficulty={difficulty}")
        return []
    collected = []
    seen_qtexts = set()
    seen_pages = set()
    total_requests = 0
    for topic in topic_urls:
        print(f"[indiabix] scanning topic {topic}")
        try:
            topic_html = _get_page(topic, timeout=DEFAULT_TIMEOUT)
        except Exception as e:
            print(f"[indiabix] failed to fetch topic {topic}: {e}")
            continue
        first_links = _get_internal_links(topic_html, topic)
        print(f"[indiabix] first-level links found: {len(first_links)}")
        queue = [topic] + first_links
        pages_visited_this_topic = 0
        while queue and len(collected) < amount:
            if pages_visited_this_topic >= MAX_PAGES_PER_TOPIC:
                print(f"[indiabix] reached MAX_PAGES_PER_TOPIC ({MAX_PAGES_PER_TOPIC}) for topic {topic}")
                break
            if total_requests >= MAX_TOTAL_REQUESTS:
                print(f"[indiabix] reached MAX_TOTAL_REQUESTS ({MAX_TOTAL_REQUESTS}) overall - stopping")
                queue = []
                break
            page = queue.pop(0)
            if page in seen_pages:
                continue
            seen_pages.add(page)
            pages_visited_this_topic += 1
            total_requests += 1
            try:
                html = _get_page(page, timeout=DEFAULT_TIMEOUT)
            except Exception as e:
                print(f"[indiabix] failed to fetch page {page}: {e}")
                continue
            parsed = _parse_question_page(html, page)
            if parsed.get("question") and parsed.get("options"):
                qtext = parsed["question"].strip()
                if qtext and qtext not in seen_qtexts:
                    choices = parsed.get("options", [])
                    correct = parsed.get("correct_answer") or ""
                    if not correct and choices:
                        correct = choices[-1]
                    incorrect = [c for c in choices if c != correct]
                    qobj = {"question": parsed["question"], "correct_answer": correct, "incorrect_answers": incorrect, "category": category.capitalize(), "difficulty": difficulty, "explanation": parsed.get("explanation",""), "source": page}
                    print(f"[indiabix] collected question (choices={len(choices)}): {qobj['question'][:120]}...")
                    collected.append(qobj)
                    seen_qtexts.add(qtext)
                time.sleep(delay)
                continue
            child_links = _get_internal_links(html, page)
            prioritized = []
            others = []
            for l in child_links:
                if l == topic:
                    continue
                slug = l.rstrip("/").split("/")[-1]
                if "/questions/" in l or slug.isdigit() or slug.startswith("0"):
                    prioritized.append(l)
                else:
                    others.append(l)
            for l in prioritized + others:
                if l not in seen_pages and l not in queue:
                    queue.append(l)
            time.sleep(delay)
        if len(collected) >= amount:
            break
    result = collected[:amount]
    print(f"[indiabix] returning {len(result)} unique questions (requested {amount})")
    set_cache(cache_key, result, ttl=300)
    return result

if __name__ == "__main__":
    import sys
    diff = sys.argv[1] if len(sys.argv) > 1 else "easy"
    num = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    print(f"[indiabix test] fetching {num} questions at difficulty={diff}")
    qs = fetch_india_questions(difficulty=diff, amount=num)
    print(json.dumps(qs, ensure_ascii=False, indent=2))
