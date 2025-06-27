from app import db, User
from werkzeug.security import generate_password_hash

def reset_admin_password(new_password):
    admin = User.query.filter_by(username='kantwi').first()
    if not admin:
        print('Admin user not found!')
        return
    admin.password_hash = generate_password_hash(new_password, method='pbkdf2:sha256')
    db.session.commit()
    print('Admin password updated successfully.')

if __name__ == '__main__':
    import os
    new_pw = os.environ.get('NEW_ADMIN_PASSWORD')
    if not new_pw:
        new_pw = input('Enter new admin password: ')
    from app import app
    with app.app_context():
        reset_admin_password(new_pw)
