DEMO: http://mozik.pythonanywhere.com/

TO DO:

1. Make structural separation:
project/
├── app/
│   ├── __init__.py            # Flask app
│   ├── routes.py              # Routes: HTTP-logic
│   ├── models.py              # SQLAlchemy models (User, Card, CardSet)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── card_service.py
│   │   └── cardset_service.py 
│   ├── utils/
│   │   └── session.py         # utils (session timeout)
│   └── config.py              # config (dev/prod)
│
├── migrations/                # Alembic (?)
├── templates/                 # HTML
├── static/                    # CSS/JS
├── tests/                     # Pytest: API, services, models
├── .env                       # env variables
├── config.ini
├── run.py                     # start
└── README.md

2. Remove database calls from logic, get the cards ONLY once and store them in the JS memory
3. Fix icons alligment
4. Add description for Card-Sets
5. Make private and public sets to share them between accounts
6. Import/Export CSV files with cards