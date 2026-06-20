# app.py
import os, time, json
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import re
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import func, cast, Integer
import sqlite3
from flask import current_app as app

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "quizpal.db")



app = Flask(__name__)


# Allow frontend origins in development. "*" allowed for dev.
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000", "*"]}}, supports_credentials=True)

# Ensure every response (including errors) has CORS headers while debugging.
@app.after_request
def add_cors_headers(response):
    response.headers.setdefault("Access-Control-Allow-Origin", "*")
    response.headers.setdefault("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    return response

# Catch unhandled exceptions and return JSON (so browser/network sees JSON + headers)
@app.errorhandler(Exception)
def handle_all_exceptions(e):
    # Print traceback to server console for debugging
    import traceback, sys
    traceback.print_exc(file=sys.stderr)

    # Build a safe JSON response
    resp = jsonify({"message": "Server error", "detail": str(e)})
    resp.status_code = 500
    # ensure CORS headers on this response
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return resp
# ---------------------------------------------------------------------------





app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_FILE}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-this")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# -----------------------
# Models
# -----------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128))
    email = db.Column(db.String(256), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.Float, default=lambda: time.time())

    def set_password(self, raw):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password_hash, raw)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "is_admin": self.is_admin}


# inside app.py, in class Question
# inside app.py - update your Question model's to_dict (or full model)

# in app.py (replace existing Question.to_dict or entire Question model)
import json, re
from datetime import datetime

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50))
    qtext = db.Column(db.Text)
    options_json = db.Column(db.Text)
    answer = db.Column(db.String(255))
    correct_index = db.Column(db.Integer, nullable=True)
    source_url = db.Column(db.String(255), nullable=True)
    difficulty = db.Column(db.String(20), default="medium")
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def _norm(self, s):
        if not s and s != 0:
            return ""
        t = str(s).strip().lower()
        t = re.sub(r"\s+", " ", t)
        # remove smart quotes and collapse punctuation differences
        t = t.replace("’", "'").replace("‘", "'").replace("`", "'")
        return t

    def to_dict(self):
        opts = []
        try:
            opts = json.loads(self.options_json) if self.options_json else []
        except Exception:
            opts = []

        # prefer stored correct_index if valid
        cidx = None
        try:
            if self.correct_index is not None:
                ii = int(self.correct_index)
                if 0 <= ii < len(opts):
                    cidx = ii
        except Exception:
            cidx = None

        # if missing compute from answer text
        if cidx is None and self.answer and isinstance(opts, list):
            na = self._norm(self.answer)
            for i, o in enumerate(opts):
                if self._norm(o) == na:
                    cidx = i
                    break
            if cidx is None:
                for i, o in enumerate(opts):
                    no = self._norm(o)
                    if na and (na in no or no in na or no.startswith(na) or na.startswith(no)):
                        cidx = i
                        break

        return {
            "id": self.id,
            "category": self.category,
            "qtext": self.qtext,
            "options": opts,
            "answer": self.answer,
            "correctIndex": cidx,
            "difficulty": self.difficulty,
            "source_url": self.source_url
        }



class Progress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, index=True)
    question_id = db.Column(db.Integer, nullable=True)
    correct = db.Column(db.Boolean, default=False)
    time = db.Column(db.Float, default=lambda: time.time())

# ---------- replace Result & CertificateRequest models with these ----------
class Result(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, index=True, nullable=False)
    quiz_id = db.Column(db.String(128), nullable=True)
    score = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Integer, nullable=False)
    difficulty = db.Column(db.String(32), default="easy")
    timestamp = db.Column(db.Float, default=lambda: time.time())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "quizId": self.quiz_id,
            "score": self.score,
            "total": self.total,
            "difficulty": self.difficulty,
            "timestamp": self.timestamp
        }


class CertificateRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, index=True, nullable=False)

    # single-direction FK -> Result (optional)
    result_id = db.Column(db.Integer, db.ForeignKey("result.id"), nullable=True)

    quiz_id = db.Column(db.String(128), nullable=True)
    score = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Integer, nullable=False)
    difficulty = db.Column(db.String(32), default="easy")
    status = db.Column(db.String(32), default="pending")  # pending, approved, rejected
    created_at = db.Column(db.Float, default=lambda: time.time())
    approved_at = db.Column(db.Float, nullable=True)

    # explicit relationship from CertificateRequest -> Result (no ambiguity)
    result = db.relationship("Result", backref=db.backref("certificate_requests", lazy="joined"), foreign_keys=[result_id], uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "result_id": self.result_id,
            "quiz_id": self.quiz_id,
            "score": self.score,
            "total": self.total,
            "difficulty": self.difficulty,
            "status": self.status,
            "created_at": self.created_at,
            "approved_at": self.approved_at
        }
# --------------------------------------------------------------------------


# -----------------------
# Utilities
# -----------------------
def ensure_db():
    db_dir = os.path.dirname(DB_FILE)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    with app.app_context():
        db.create_all()

def add_sample_data():
    if Question.query.count() == 0:
        sample = [
            ("aptitude", "If average of 2 numbers is 10 and one is 6, other is?", ["4", "6", "14", "10"], "14", "easy"),
            ("verbal", "Pick the correct synonym for 'abundant'", ["scarce", "plentiful", "rare", "small"], "plentiful", "easy"),
            ("technical", "What does CPU stand for?", ["Central Processing Unit","Computer Processing Unit","Central Print Unit","Control Program Unit"], "Central Processing Unit", "easy"),
        ]
        for cat, qtxt, opts, ans, diff in sample:
            q = Question(category=cat, qtext=qtxt, options_json=json.dumps(opts), answer=ans, difficulty=diff)
            db.session.add(q)
        db.session.commit()
    # create a default admin if none
    if User.query.filter_by(is_admin=True).count() == 0:
        admin = User(name="Admin", email="admin@example.com", is_admin=True)
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()

# -----------------------
# Auth endpoints
# -----------------------
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    name = data.get("name") or ""
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"message": "Missing email or password"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 400
    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))
    return jsonify({"token": token, "user": user.to_dict()}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"message": "Missing email or password"}), 400
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401
    token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))
    return jsonify({"token": token, "user": user.to_dict()}), 200

@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200

# -----------------------
# Questions & progress
# -----------------------
@app.route("/api/questions/<category>", methods=["GET"])
def get_questions(category):
    category = category.lower()
    if category not in ("aptitude", "verbal", "technical"):
        return jsonify({"error": "Invalid category"}), 400
    limit = min(int(request.args.get("limit", 20)), 100)
    qs = Question.query.filter_by(category=category).order_by(Question.id.desc()).limit(limit).all()
    return jsonify({"category": category, "count": len(qs), "questions": [q.to_dict() for q in qs]}), 200

@app.route("/api/progress/<int:uid>", methods=["GET"])
@jwt_required()
def get_progress(uid):
    try:
        # normalize caller identity (tokens may store id as str)
        caller_identity = get_jwt_identity()
        try:
            caller_id = int(caller_identity)
        except Exception:
            caller_id = caller_identity

        calling_user = User.query.get(caller_id)
        if caller_id != uid and not (calling_user and calling_user.is_admin):
            return jsonify({"message": "Unauthorized"}), 403

        results = Result.query.filter_by(user_id=uid).order_by(Result.timestamp.asc()).all()
        attempts = Progress.query.filter_by(user_id=uid).order_by(Progress.time.desc()).limit(200).all()
        stats = {"total": len(attempts), "correct": sum(1 for a in attempts if a.correct)}

        out_results = []
        for r in results:
            cert = None
            if getattr(r, "certificate_request_id", None):
                c = CertificateRequest.query.get(r.certificate_request_id)
                if c:
                    cert = {"id": c.id, "status": c.status, "approved_at": c.approved_at}
            out_results.append({
                "id": r.id,
                "quizId": r.quiz_id,
                "score": r.score,
                "total": r.total,
                "difficulty": r.difficulty,
                "timestamp": r.timestamp,
                "certificate": cert
            })

        return jsonify({
            "stats": stats,
            "attempts": [{"question_id": a.question_id, "correct": a.correct, "time": a.time} for a in attempts],
            "results": out_results
        }), 200

    except Exception as e:
        # Print full traceback to the server console so we can see the problem
        import traceback, sys
        traceback.print_exc(file=sys.stderr)
        # return JSON so front-end gets a readable body (and CORS headers are added by after_request)
        return jsonify({"message": "Server error while fetching progress", "error": str(e)}), 500


@app.route("/api/progress/record", methods=["POST"])
@jwt_required()
def record_progress():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    qid = data.get("question_id")
    correct = bool(data.get("correct"))
    p = Progress(user_id=uid, question_id=qid, correct=correct)
    db.session.add(p)
    db.session.commit()
    return jsonify({"ok": True}), 201



# -----------------------
# Results & certificates
# -----------------------
@app.route("/api/results", methods=["POST"])
@jwt_required()
def create_result():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    quiz_id = data.get("quizId")
    score = int(data.get("score") or 0)
    total = int(data.get("total") or 0)
    difficulty = data.get("difficulty") or "easy"
    r = Result(user_id=uid, quiz_id=quiz_id, score=score, total=total, difficulty=difficulty)
    db.session.add(r)
    db.session.commit()
    return jsonify({"success": True, "result": r.to_dict()}), 201

@app.route("/api/certificate/request", methods=["POST"])
@jwt_required()
def request_certificate():
    uid = get_jwt_identity()
    data = request.get_json() or {}

    app.logger.info("Incoming certificate request from uid=%s: %s", uid, data)

    quiz_id = data.get("quizId") or data.get("quiz_id")
    result_id = data.get("resultId") or data.get("result_id")

    try:
        score = data.get("score")
        total = data.get("total")
        if score is None or total is None:
            return jsonify({"success": False, "msg": "score and total are required"}), 422
        score = int(score)
        total = int(total)
    except Exception:
        return jsonify({"success": False, "msg": "score and total must be integers"}), 422

    difficulty = data.get("difficulty") or "easy"

    if result_id:
        try:
            result_id_int = int(result_id)
        except Exception:
            return jsonify({"success": False, "msg": "resultId must be an integer"}), 422

        res = Result.query.get(result_id_int)
        if not res or res.user_id != uid:
            return jsonify({"success": False, "message": "Result not found or unauthorized"}), 403
        result_id = result_id_int
    else:
        if not quiz_id:
            return jsonify({"success": False, "msg": "quizId or resultId required"}), 422
        quiz_id = str(quiz_id)

    # --- AUTO-APPROVE: set status approved immediately and record approved_at ---
    req = CertificateRequest(
        user_id=uid,
        result_id=result_id,
        quiz_id=quiz_id,
        score=score,
        total=total,
        difficulty=difficulty,
        status="approved",
        approved_at=time.time(),
        created_at=time.time()
    )
    db.session.add(req)
    db.session.commit()

    # link back to result if applicable
    if result_id:
        res.certificate_request_id = req.id
        db.session.commit()

    app.logger.info("CertificateRequest AUTO-APPROVED id=%s by uid=%s", req.id, uid)
    return jsonify({"success": True, "requestId": req.id, "status": req.status, "request": req.to_dict()}), 201

@app.route("/api/certificate/requests/<int:req_id>/approve", methods=["POST"])
@jwt_required()
def approve_certificate(req_id):
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user or not user.is_admin:
        return jsonify({"message": "Unauthorized"}), 403

    req = CertificateRequest.query.get(req_id)
    if not req:
        return jsonify({"message": "Not found"}), 404

    req.status = "approved"
    req.approved_at = time.time()
    db.session.commit()

    if req.result_id:
        r = Result.query.get(req.result_id)
        if r and not r.certificate_request_id:
            r.certificate_request_id = req.id
            db.session.commit()

    return jsonify({"success": True, "requestId": req.id, "status": req.status}), 200

# -----------------------
# Admin helpers
# -----------------------
@app.route("/api/admin/data", methods=["GET"])
@jwt_required()
def admin_data():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user or not user.is_admin:
        return jsonify({"message": "Unauthorized"}), 403
    quizzes_count = Question.query.count()
    users_count = User.query.count()
    return jsonify({"quizzes_count": quizzes_count, "users_count": users_count, "server_time": int(time.time())}), 200

@app.route("/api/admin/progress", methods=["GET"])
@jwt_required()
def admin_progress_all():
    caller = get_jwt_identity()
    calling_user = User.query.get(caller)
    if not calling_user or not calling_user.is_admin:
        return jsonify({"message": "Unauthorized"}), 403

    # Outer join Users -> Progress so users with zero attempts are included.
    # Aggregates: total attempts, correct attempts, and last attempt time.
    q = db.session.query(
        User.id.label("user_id"),
        User.name.label("name"),
        User.email.label("email"),
        func.count(Progress.id).label("total"),
        func.sum(cast(Progress.correct, Integer)).label("correct"),
        func.max(Progress.time).label("last_time")
    ).outerjoin(Progress, Progress.user_id == User.id).group_by(User.id).all()

    results = []
    for row in q:
        user_id = int(row.user_id)
        name = row.name or ""
        email = row.email or ""
        total = int(row.total or 0)
        correct = int(row.correct or 0)
        last_time = row.last_time

        # compute streak from recent attempts (only if there are attempts)
        streak = 0
        if total > 0:
            last_attempts = Progress.query.filter_by(user_id=user_id).order_by(Progress.time.desc()).limit(10).all()
            for a in last_attempts:
                if a.correct:
                    streak += 1
                else:
                    break

        # Accuracy (0 if no attempts)
        accuracy = int(round((correct / total) * 100)) if total > 0 else 0

        results.append({
            "user_id": user_id,
            "name": name,
            "email": email,
            "total": total,
            "correct": correct,
            "accuracy": accuracy,
            "last_time": last_time,
            "streak": int(streak)
        })

    return jsonify({"progress": results}), 200


# -----------------------
# Printable certificate route (simple HTML)
# -----------------------
CERT_TEMPLATE = """
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Certificate #{{id}}</title>
  <style>
    body { font-family: Arial, sans-serif; padding:40px; text-align:center; }
    .card { border: 2px solid #1976d2; padding: 40px; display:inline-block; border-radius:8px; }
    h1 { margin: 0 0 12px 0; color:#1976d2; }
    p { margin: 6px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Certificate of Completion</h1>
    <p>This is to certify that</p>
    <h2>{{name}}</h2>
    <p>has successfully completed the quiz <strong>{{quiz}}</strong></p>
    <p>Score: <strong>{{score}} / {{total}}</strong></p>
    <p>On: {{date}}</p>
    <p>Certificate ID: <small>{{id}}</small></p>
  </div>
  <script>window.print()</script>
</body>
</html>
"""

# Remove the @jwt_required() decorator so this route is public
@app.route("/certificate/print/<result_id>", methods=["GET"])
def certificate_print(result_id):
    # Load result
    result = Result.query.get(result_id)
    if not result:
        return "<h3>Result not found</h3>", 404

    # Load user
    user = User.query.get(result.user_id)
    if not user:
        return "<h3>User not found</h3>", 404

    # Render directly — no approval, no certificate request needed
    html = render_template_string(
        CERT_TEMPLATE,
        id=result.id,
        name=user.name or user.email,
        quiz=result.quiz_id or "Quiz",
        score=result.score,
        total=result.total,
        date=datetime.utcfromtimestamp(result.timestamp).strftime("%Y-%m-%d")
    )
    return html

# -----------------------
# Health
# -----------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "ts": int(time.time())})
@app.route('/api/progress', methods=['POST'])
@jwt_required()
def save_progress():
    """
    Saves quiz-level progress/result and optional breakdown to DB.
    Request JSON (examples):
    {
      "quizId": "quiz-123",
      "score": 18,
      "total": 20,
      "difficulty": "medium",
      "breakdown": { "aptitude": {"total": 10, "correct":8}, ... },
      "timestamp": 1690000000
    }
    Requires an authenticated user (token). Returns saved result and inserted breakdown summary.
    """
    try:
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify({"message": "Unauthorized (user not found)"}), 403

        data = request.get_json() or {}
        quiz_id = data.get("quizId") or data.get("quiz_id")
        score = data.get("score")
        total = data.get("total")
        difficulty = data.get("difficulty") or "easy"
        breakdown = data.get("breakdown") or {}
        timestamp = data.get("timestamp")

        # Basic validation for score/total if provided
        if score is None or total is None:
            # allow saving breakdown-only (per-question) if breakdown present
            if not breakdown:
                return jsonify({"message": "score and total are required (or provide breakdown)"}), 422

        # If score/total provided, create a Result row
        saved_result = None
        if score is not None and total is not None:
            try:
                score_int = int(score)
                total_int = int(total)
            except Exception:
                return jsonify({"message": "score and total must be integers"}), 422

            res = Result(user_id=uid, quiz_id=str(quiz_id) if quiz_id else None, score=score_int, total=total_int, difficulty=difficulty)
            db.session.add(res)
            db.session.flush()  # get id before commit if needed
            saved_result = res.to_dict()

        # Optionally persist breakdown: we will create Progress rows per-topic summary.
        # Note: Progress model currently stores per-question attempts; we can store topic summaries
        # as aggregated Progress rows with question_id = None and correct being True for proportional correctness,
        # Or better: create a separate table. For simplicity we store an aggregate record per topic in Progress with question_id=None.
        inserted_breakdown = {}
        if breakdown and isinstance(breakdown, dict):
            for topic, vals in breakdown.items():
                try:
                    t = int(vals.get("total", 0))
                    c = int(vals.get("correct", 0))
                except Exception:
                    t = 0
                    c = 0
                # We'll persist t rows with correct flag for each simulated attempt (avoid huge insert)
                # Instead store one summary row into a new lightweight table or into Result's metadata — but to keep changes minimal:
                # We'll create a ProgressSummary-like insert using Result linking if result exists.
                # Simple approach: create a Progress row for the topic summary (question_id = None) and store JSON in an ad-hoc way
                # For now add a ResultDetail-like row into CertificateRequest? Avoid schema change — instead return the breakdown to the client
                inserted_breakdown[topic] = {"total": t, "correct": c}
            # we do not create many per-question Progress rows here to avoid spamming DB.
            # If you want to create one row per topic, uncomment below:
            # for topic, vals in inserted_breakdown.items():
            #     p = Progress(user_id=uid, question_id=None, correct=bool(vals['correct']), time=time.time())
            #     db.session.add(p)

        db.session.commit()

        resp = {
            "success": True,
            "result": saved_result,
            "breakdown": inserted_breakdown,
            "saved_by": uid,
            "timestamp": timestamp or time.time()
        }
        return jsonify(resp), 201

    except Exception as e:
        app.logger.exception("Error in save_progress")
        return jsonify({"message": "Server error", "error": str(e)}), 500
@app.route("/api/progress/sql/<int:uid>", methods=["GET"])
@jwt_required()
def progress_sql(uid):
    caller = get_jwt_identity()
    calling_user = User.query.get(caller)
    if caller != uid and not (calling_user and calling_user.is_admin):
        return jsonify({"message": "Unauthorized"}), 403

    # Use the same DB file path as SQLAlchemy (ensure it is same DB)
    db_path = DB_FILE  # DB_FILE defined earlier at top of file
    try:
        con = sqlite3.connect(db_path)
        con.row_factory = sqlite3.Row
        cur = con.cursor()

        # Recent attempts (limit 200)
        cur.execute(
            "SELECT id, user_id, question_id, correct, time FROM progress WHERE user_id = ? ORDER BY time DESC LIMIT 200",
            (uid,)
        )
        attempts = [dict(r) for r in cur.fetchall()]

        # Aggregates
        cur.execute(
            "SELECT COUNT(*) AS total, SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END) AS correct FROM progress WHERE user_id = ?",
            (uid,)
        )
        ag = cur.fetchone()
        total = int(ag["total"] or 0)
        correct = int(ag["correct"] or 0)

        # Optional: breakdown by question (or category if you have a category column)
        # Here we produce a simple breakdown by question_id
        cur.execute(
            "SELECT question_id, COUNT(*) AS total, SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END) AS correct FROM progress WHERE user_id = ? GROUP BY question_id",
            (uid,)
        )
        breakdown_rows = [dict(r) for r in cur.fetchall()]
        # convert to dictionary keyed by question_id for easy use on client
        breakdown = {}
        for r in breakdown_rows:
            qid = str(r["question_id"])
            breakdown[qid] = {"total": int(r["total"]), "correct": int(r["correct"])}

        con.close()
        return jsonify({
            "stats": {"total": total, "correct": correct, "breakdown": breakdown},
            "attempts": attempts
        }), 200

    except Exception as e:
        app.logger.exception("progress_sql error")
        return jsonify({"message": "Server error", "error": str(e)}), 500

# -----------------------
# Start
# -----------------------
if __name__ == "__main__":
    ensure_db()
    with app.app_context():
        add_sample_data()
    app.run(host="127.0.0.1", port=5000, debug=True)  