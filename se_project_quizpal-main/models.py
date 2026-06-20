# models.py
from flask_sqlalchemy import SQLAlchemy
import time

db = SQLAlchemy()

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50))   # aptitude / verbal / technical
    qtext = db.Column(db.Text)
    options = db.Column(db.Text)
    answer = db.Column(db.String(255))
    source_url = db.Column(db.String(255))
    last_updated = db.Column(db.Float, default=time.time)

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "category": self.category,
            "qtext": self.qtext,
            "options": json.loads(self.options),
            "answer": self.answer
        }
