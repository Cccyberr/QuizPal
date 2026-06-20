# app.py (replace existing file or merge changes)
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import time

app = Flask(__name__)

# Enable CORS for all /api/* routes during development.
# In production, replace origins="*" with your specific origin(s).
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Optional: set up logging to stdout
logging.basicConfig(level=logging.DEBUG)

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "msg": "server healthy"})

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(force=True, silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"message": "Missing email or password"}), 400
    # (Do not store plaintext passwords — this is a demo response)
    token = "demo-token-123"
    return jsonify({"token": token, "user": {"name": name, "email": email}}), 200

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True, silent=True) or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"message": "Missing email or password"}), 400
    token = "demo-login-token"
    return jsonify({"token": token}), 200

# Debug helper: list all routes (run once after app startup)
@app.before_first_request
def list_routes():
    app.logger.debug("Registered routes:")
    for rule in app.url_map.iter_rules():
        app.logger.debug(f"{rule} -> methods={rule.methods}")

@app.route("/api/admin/data", methods=["GET"])
def admin_data():
    data = {
        "users_count": 42,
        "quizzes_count": 8,
        "server_time": int(time.time() * 1000)
    }
    return jsonify(data), 200


if __name__ == "__main__":
    # Use explicit host and port
    # Note: FLASK_ENV is deprecated; use FLASK_DEBUG env var if needed
    app.run(host="127.0.0.1", port=5000, debug=True)
