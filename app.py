from flask import Flask, jsonify, render_template, request, redirect, url_for, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import timedelta, datetime
import configparser

app = Flask(__name__)
CORS(app)  # Allow frontend to communicate with the backend
config_file = configparser.ConfigParser()

# Read configuration from config.ini file
config_file.read('config.ini')
app.config['SECRET_KEY'] = config_file['flask']['SECRET_KEY']
app.config['SQLALCHEMY_DATABASE_URI'] = config_file['flask']['SQLALCHEMY_DATABASE_URI']
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = config_file['flask']['SQLALCHEMY_TRACK_MODIFICATIONS']

SESSION_TIMEOUT = timedelta(minutes=30)

db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(100), nullable=False)

class CardSet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    cards = db.relationship('Card', backref='set', lazy=True)
    cards_counter = db.Column(db.Integer, default=0)

class Card(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    front_text = db.Column(db.String(200), nullable=False)
    back_text = db.Column(db.String(200), nullable=False)
    card_set_id = db.Column(db.Integer, db.ForeignKey('card_set.id'), nullable=False)
    is_learned = db.Column(db.Boolean, default=False)

with app.app_context():
    db.create_all()

def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Check AUTH
        if 'user_id' not in session:
            return redirect(url_for('login'))
        # Check inactivity
        last_activity = session.get('last_activity')
        if last_activity:
            last_activity_time = datetime.strptime(last_activity, '%Y-%m-%d %H:%M:%S')
            if datetime.now() - last_activity_time > SESSION_TIMEOUT:
                session.clear()
                return redirect(url_for('login'))
        # Update time
        session['last_activity'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        return func(*args, **kwargs)
    return wrapper

def redirection(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if 'user_id' in session:
            return redirect(url_for('dashboard'))  # Redirect on dashboard
        return func(*args, **kwargs)
    return wrapper

def update_cards_counter(card_set_id):
    card_set = db.session.get(CardSet, card_set_id)
    if card_set:
        card_set.cards_counter = len(card_set.cards)
        db.session.commit()

# API Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
@redirection
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Check if the user exists in the database
        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password_hash, password):
            # If the user exists and the password is correct, log them in
            session['user_id'] = user.id
            return redirect(url_for('dashboard'))
        else:
            return "Invalid username or password", 401

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
@redirection
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Check if the user already exists
        existing_user = User.query.filter_by(username=username).first()

        if existing_user:
            return "Username already exists", 400

        # Hash the password before storing it
        hashed_password = generate_password_hash(password)

        new_user = User(username=username, password_hash=hashed_password)

        try:
            db.session.add(new_user)
            db.session.commit()
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            return f"Error: {e}"

    return render_template('register.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))


# Fetch card sets
@app.route('/card-sets', methods=['GET'])
@login_required
def get_card_sets():
    sets = CardSet.query.all()
    return jsonify([{"id": s.id, "name": s.name} for s in sets])

# Add a new card set
@app.route('/card-sets', methods=['POST'])
@login_required
def add_card_set():
    data = request.json
    new_set = CardSet(name=data['name'])
    db.session.add(new_set)
    db.session.commit()
    return jsonify({"id": new_set.id, "name": new_set.name}), 201

@app.route('/card-sets/<set_id>/cards/count', methods=['GET'])
@login_required
def get_card_count(set_id):
    if set_id == 'default':  # For SET "ALL"
        count = Card.query.count()  # return All cards.count
    else:
        count = Card.query.filter_by(card_set_id=set_id).count()
    return jsonify({'count': count})  # Return JSON-response

@app.route('/play/<set_id>')
@login_required
def play_set(set_id):
    if set_id == 'all':
        # Get all cards from DB
        cards = Card.query.all()
    else:
        # Get cards from SET
        cards = Card.query.filter_by(card_set_id=set_id).all()

    return render_template('play.html', cards=cards, set_id=set_id)

@app.route('/edit/<set_id>')
@login_required
def edit_set(set_id):
    if set_id == 'all':
        cards = Card.query.all()
    else:
        cards = Card.query.filter_by(card_set_id=set_id).all()
    
    return render_template('edit.html', cards=cards, set_id=set_id)
    
@app.route('/next-card/<set_id>', methods=['GET'])
@login_required
def next_card(set_id):
    if set_id == 'all':
        cards = Card.query.all()
    else:
        cards = Card.query.filter_by(card_set_id=set_id).all()

    if not cards:
        return jsonify({'error': 'No cards available'}), 404
    
    current_index = session.get('current_card_index', 0)

    card = cards[current_index]

    next_index = (current_index + 1) % len(cards)
    session['current_card_index'] = next_index
    
    if card:
        return jsonify({
            'id': card.id,
            'front_text': card.front_text,
            'back_text': card.back_text,
            'is_learned': card.is_learned
        })
    else:
        return jsonify({'error': 'No cards available'}), 404
    
@app.route('/get-cards/<set_id>', methods=['GET'])
@login_required
def get_cards(set_id):
    if set_id == 'all':
        cards = Card.query.all()
    else:
        cards = Card.query.filter_by(card_set_id=set_id).all()
    return jsonify([
        {
            'id': card.id,
            'front_text': card.front_text,
            'back_text': card.back_text,
            'is_learned': card.is_learned,
            'card_set_id': card.card_set_id
        } for card in cards
    ])

@app.route('/toggle-like/<card_id>', methods=['POST'])
@login_required
def toggle_like(card_id):
    card = db.session.get(Card, card_id)
    
    if card:
        # Change LIKE status
        card.is_learned = not card.is_learned
        db.session.commit()
        return jsonify({
            'id': card.id,
            'is_learned': card.is_learned
        })
    else:
        return jsonify({'error': 'Card not found'}), 404

@app.route('/get-card/<card_id>', methods=['GET'])
@login_required
def get_card(card_id):
    card = db.session.get(Card, card_id)

    if card:
        return jsonify({
            'id': card.id,
            'front_text': card.front_text,
            'back_text': card.back_text,
            'is_learned': card.is_learned
        })
    else:
        return jsonify({'error': 'Card not found'}), 404
    
@app.route('/save-cards', methods=['POST'])
@login_required
def save_cards():
    data = request.json.get('cards', [])
    set_id = request.json.get('card_set_id')  # GET SET_ID

    if not set_id:
        return jsonify({'error': 'Card set ID is required'}), 400

    for card_data in data:
        if card_data.get('id'):
            # Refresh current card
            card = db.session.get(Card, card_data['id'])
            if card:
                card.front_text = card_data.get('front', card.front_text)
                card.back_text = card_data.get('back', card.back_text)
                card.is_learned = card_data.get('isLearned', card.is_learned)
        else:
            # Create new card
            new_card = Card(
                front_text=card_data.get('front', ''),
                back_text=card_data.get('back', ''),
                card_set_id=set_id,
                is_learned=card_data.get('isLearned', False)
            )
            db.session.add(new_card)

    db.session.commit()

    # Update counter
    update_cards_counter(set_id)

    return jsonify({'message': 'Cards updated successfully!'})

@app.route('/delete-card/<int:card_id>', methods=['DELETE'])
@login_required
def delete_card(card_id):
    card = db.session.get(Card, card_id)
    if card:
        db.session.delete(card)
        db.session.commit()
        return jsonify({'message': 'Card deleted successfully!'})
    return jsonify({'error': 'Card not found'}), 404

@app.route('/delete-card-set/<int:set_id>', methods=['DELETE'])
@login_required
def delete_card_set(set_id):
    card_set = db.session.get(CardSet, set_id)
    if card_set:
        # Delete cards from SET
        db.session.query(Card).filter_by(card_set_id=set_id).delete()
        # Delete SET
        db.session.delete(card_set)
        db.session.commit()
        return jsonify({'message': 'Card set and its cards deleted successfully!'}), 200
    return jsonify({'error': 'Card set not found'}), 404



if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create tables if they don't exist
    app.run(debug=True, host='0.0.0.0', port=5000)