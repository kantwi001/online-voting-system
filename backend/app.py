from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)
import os
# Use absolute path for SQLite DB
DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'voting.db')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + DB_PATH
db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(16), nullable=False, default='user')  # 'admin' or 'user'

class Election(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)

class Candidate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    election_id = db.Column(db.Integer, db.ForeignKey('election.id'), nullable=False)
    photo_url = db.Column(db.String(256), nullable=True)  # URL or filename for candidate photo

class Vote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    election_id = db.Column(db.Integer, db.ForeignKey('election.id'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidate.id'), nullable=False)
    __table_args__ = (db.UniqueConstraint('user_id', 'election_id', name='unique_vote'),)

class Settings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    smtp_host = db.Column(db.String(128))
    smtp_port = db.Column(db.Integer)
    smtp_user = db.Column(db.String(128))
    smtp_password = db.Column(db.String(128))
    smtp_from = db.Column(db.String(128))
    smtp_tls = db.Column(db.Boolean, default=True)

# Routes

@app.route('/elections/<int:election_id>/candidates', methods=['POST'])
@admin_required
def add_candidate(election_id):
    data = request.json
    name = data.get('name')
    photo_url = data.get('photo_url')
    if not name:
        return jsonify({'message': 'Candidate name required'}), 400
    candidate = Candidate(name=name, election_id=election_id, photo_url=photo_url)
    db.session.add(candidate)
    db.session.commit()
    return jsonify({'message': 'Candidate added', 'candidate': {'id': candidate.id, 'name': candidate.name, 'photo_url': candidate.photo_url}})

@app.route('/candidates/<int:candidate_id>', methods=['DELETE'])
@admin_required
def delete_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return jsonify({'message': 'Candidate not found'}), 404
    db.session.delete(candidate)
    db.session.commit()
    return jsonify({'message': 'Candidate deleted'})

from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        username = request.json.get('username') if request.json else request.args.get('username')
        user = User.query.filter_by(username=username).first()
        if not user or user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Admins only'}), 403
        return f(*args, **kwargs)
    return decorated

@app.route('/users', methods=['GET'])
@admin_required
def users():
    users = User.query.all()
    return jsonify([
        {'id': u.id, 'username': u.username, 'role': u.role}
        for u in users
    ])

@app.route('/settings', methods=['GET', 'POST'])
@admin_required
def settings():
    if request.method == 'GET':
        smtp = Settings.query.first()
        if not smtp:
            return jsonify({})
        return jsonify({
            'smtp_host': smtp.smtp_host,
            'smtp_port': smtp.smtp_port,
            'smtp_user': smtp.smtp_user,
            'smtp_password': smtp.smtp_password,
            'smtp_from': smtp.smtp_from,
            'smtp_tls': smtp.smtp_tls
        })
    else:
        data = request.json
        smtp = Settings.query.first()
        if not smtp:
            smtp = Settings()
            db.session.add(smtp)
        smtp.smtp_host = data.get('smtp_host')
        smtp.smtp_port = data.get('smtp_port')
        smtp.smtp_user = data.get('smtp_user')
        smtp.smtp_password = data.get('smtp_password')
        smtp.smtp_from = data.get('smtp_from')
        smtp.smtp_tls = data.get('smtp_tls', True)
        db.session.commit()
        return jsonify({'message': 'Settings updated successfully'})

@app.route('/change_password', methods=['POST'])
def change_password():
    data = request.json
    username = data.get('username')
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    if not username or not current_password or not new_password:
        return jsonify({'message': 'Missing required fields'}), 400
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, current_password):
        return jsonify({'message': 'Invalid username or current password'}), 403
    user.password_hash = generate_password_hash(new_password, method='pbkdf2:sha256')
    db.session.commit()
    return jsonify({'message': 'Password updated successfully'})
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        print('Registration attempt:', data)
        if not data or 'username' not in data or 'password' not in data:
            print('Missing username or password')
            return jsonify({'message': 'Missing username or password'}), 400
        # Restrict registration to 'kantwi' or emails ending with '@dktawa.org'
        if not (data['username'] == 'kantwi' or data['username'].endswith('@dktawa.org')):
            print('Registration restricted to dktawa.org emails or kantwi')
            return jsonify({'message': 'Registration restricted: Only kantwi or dktawa.org emails allowed'}), 400
        if User.query.filter_by(username=data['username']).first():
            print('Username already exists:', data['username'])
            return jsonify({'message': 'Username already exists'}), 400
        # Assign role: 'admin' for kantwi, 'user' for others
        role = 'admin' if data['username'] == 'kantwi' else 'user'
        user = User(username=data['username'], password_hash=generate_password_hash(data['password'], method='pbkdf2:sha256'), role=role)
        db.session.add(user)
        db.session.commit()
        print('User registered:', data['username'], 'Role:', role)
        return jsonify({'message': 'Registered successfully'})
    except Exception as e:
        print('Registration error:', str(e))
        return jsonify({'message': 'Registration error: ' + str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password_hash, data['password']):
        return jsonify({'message': 'Login successful', 'user_id': user.id, 'role': user.role})
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/elections', methods=['GET', 'POST'])
def elections():
    if request.method == 'POST':
        data = request.json
        # Only admin can create elections
        username = data.get('username')
        user = User.query.filter_by(username=username).first()
        if not user or user.role != 'admin':
            return jsonify({'message': 'Unauthorized: Only admin can create elections'}), 403
        election = Election(title=data['title'])
        db.session.add(election)
        db.session.commit()
        for c in data['candidates']:
            # Accept either a string (name) or dict ({name, photo_url})
            if isinstance(c, dict):
                candidate = Candidate(name=c.get('name'), election_id=election.id, photo_url=c.get('photo_url'))
            else:
                candidate = Candidate(name=c, election_id=election.id)
            db.session.add(candidate)
        db.session.commit()
        return jsonify({'message': 'Election created'})
    else:
        elections = Election.query.all()
        result = []
        for e in elections:
            candidates = Candidate.query.filter_by(election_id=e.id).all()
            result.append({'id': e.id, 'title': e.title, 'candidates': [{'id': c.id, 'name': c.name, 'photo_url': c.photo_url} for c in candidates]})
        return jsonify(result)

@app.route('/vote', methods=['POST'])
def vote():
    data = request.json
    # Prevent duplicate votes
    if Vote.query.filter_by(user_id=data['user_id'], election_id=data['election_id']).first():
        return jsonify({'message': 'User has already voted'}), 400
    vote = Vote(user_id=data['user_id'], election_id=data['election_id'], candidate_id=data['candidate_id'])
    db.session.add(vote)
    db.session.commit()
    # Send email after vote
    email_sent = False
    email_error = None
    try:
        user = User.query.get(data['user_id'])
        election = Election.query.get(data['election_id'])
        candidate = Candidate.query.get(data['candidate_id'])
        smtp = Settings.query.first()
        if smtp and user and (user.username == 'kantwi' or '@' in user.username):
            import smtplib
            from email.mime.text import MIMEText
            to_addr = user.username if '@' in user.username else None
            if to_addr:
                body = f"Dear {user.username},\n\nYour vote for '{candidate.name}' in the '{election.title}' election has been received.\n\nThank you for voting!"
                msg = MIMEText(body)
                msg['Subject'] = f"Vote Confirmation: {election.title}"
                msg['From'] = smtp.smtp_from
                msg['To'] = to_addr
                server = smtplib.SMTP(smtp.smtp_host, smtp.smtp_port)
                if smtp.smtp_tls:
                    server.starttls()
                server.login(smtp.smtp_user, smtp.smtp_password)
                server.sendmail(smtp.smtp_from, [to_addr], msg.as_string())
                server.quit()
                email_sent = True
    except Exception as e:
        email_error = str(e)
        print('Failed to send vote confirmation email:', email_error)
    return jsonify({'message': 'Vote cast', 'email_sent': email_sent, 'email_error': email_error})

@app.route('/admin/election_summary', methods=['GET'])
@admin_required
def election_summary():
    users = User.query.filter(User.username != 'kantwi').all()
    user_ids = set(u.id for u in users)
    elections = Election.query.all()
    summary = []
    for election in elections:
        candidates = Candidate.query.filter_by(election_id=election.id).all()
        votes = Vote.query.filter_by(election_id=election.id).all()
        voted_user_ids = set(v.user_id for v in votes)
        summary.append({
            'title': election.title,
            'candidates': len(candidates),
            'voters': len(user_ids),
            'voted': len(voted_user_ids & user_ids)  # only eligible users
        })
    return jsonify(summary)

@app.route('/admin/vote_report/<int:election_id>', methods=['GET'])
@admin_required
def vote_report(election_id):
    candidates = Candidate.query.filter_by(election_id=election_id).all()
    votes = Vote.query.filter_by(election_id=election_id).all()
    tally = {c.name: 0 for c in candidates}
    for v in votes:
        candidate = next((c for c in candidates if c.id == v.candidate_id), None)
        if candidate:
            tally[candidate.name] += 1
    return jsonify(tally)

@app.route('/results/<int:election_id>', methods=['GET'])
def results(election_id):
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    if not user or user.username != 'kantwi' or user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    candidates = Candidate.query.filter_by(election_id=election_id).all()
    votes = Vote.query.filter_by(election_id=election_id).all()
    tally = {c.id: 0 for c in candidates}
    for v in votes:
        tally[v.candidate_id] += 1
    return jsonify({c.name: {'votes': tally[c.id], 'photo_url': c.photo_url} for c in candidates})

@app.route('/user_count', methods=['GET'])
def user_count():
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    if not user or user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    count = User.query.count()
    return jsonify({'count': count})

@app.route('/')
def index():
    return (
        '<h2>Online Voting API is running!</h2>'
        '<p>Try <a href="/elections">/elections</a> or <a href="/admin/election_summary">/admin/election_summary</a> for API data.</p>'
    )

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    with app.app_context():
        db.create_all()
    app.run(debug=False, host=args.host, port=args.port)
