# Online Voting System – Production Deployment Guide

This guide will help you deploy the Online Voting System (Flask API, React frontend, Dash dashboard) in a production environment.

---

## 1. Backend (Flask API)
- **Production WSGI:** Use [Gunicorn](https://gunicorn.org/) or [uWSGI](https://uwsgi-docs.readthedocs.io/) instead of `flask run`.
- **Install dependencies:**
  ```sh
  pip3 install -r requirements.txt
  ```
- **Run with Gunicorn:**
  ```sh
  gunicorn -w 4 -b 0.0.0.0:5001 app:app
  ```
- **Environment:** Set `FLASK_ENV=production` and configure your SMTP/database settings securely.
- **CORS:** Already enabled for cross-origin requests.

---

## 2. Frontend (React)
- **Build for production:**
  ```sh
  cd ../frontend
  npm install
  npm run build
  ```
  This creates a `build` directory with static files.
- **Serve static files:** Use Nginx, Apache, or [serve](https://www.npmjs.com/package/serve):
  ```sh
  npx serve -s build
  ```
- **API URL:** Set the API base URL in `.env` or as needed for your deployment.

---

## 3. Dash App (Dashboard)
- **Production WSGI:** Run with Gunicorn for production:
  ```sh
  gunicorn -w 2 -b 0.0.0.0:8050 vote_report_dash:app
  ```
- **Dependencies:** Already included in `requirements.txt`.

---

## 4. Database
- **Backup:** Regularly backup `backend/instance/voting.db`.
- **Migrations:** Use [Flask-Migrate](https://flask-migrate.readthedocs.io/) for schema changes.

---

## 5. Security
- Change all default passwords.
- Use HTTPS in production (with a reverse proxy like Nginx).
- Never expose your SMTP or DB passwords in code or public repos.

---

## 6. Admin Management & Automation

### Admin Password Reset
To reset the admin password (e.g., for username `kantwi`):

```sh
cd backend
NEW_ADMIN_PASSWORD="your_new_password" python3 reset_admin_password.py
```

Or use the automation script:

```sh
./admin_tasks.sh reset-admin-password your_new_password
```

### Database Migration (Create Tables)

```sh
./admin_tasks.sh migrate-db
```

### Note on Database Files
- The database file (`backend/instance/voting.db`) is **not tracked in git** for security and privacy reasons.
- Always backup your database file regularly.
- If you need to share schema changes, use migration tools (e.g., Flask-Migrate).

---

## 7. Useful Commands
- **Backend:**
  ```sh
  cd backend
  gunicorn -w 4 -b 0.0.0.0:5001 app:app
  ```
- **Frontend:**
  ```sh
  cd frontend
  npm run build
  npx serve -s build
  ```
- **Dashboard:**
  ```sh
  cd backend
  gunicorn -w 2 -b 0.0.0.0:8050 vote_report_dash:app
  ```

---

## 7. Environment Variables
- `FLASK_ENV=production`
- `DATABASE_URL=sqlite:///backend/instance/voting.db`
- `SMTP_*` for mail settings

---

## 8. Troubleshooting
- Always check logs for errors.
- Ensure ports 5001 and 8050 are open and not blocked by firewalls.
- For static file issues, check your Nginx/Apache config.

---

## 9. Contact
For support or questions, contact the admin or project maintainer.

---

**Congratulations! Your Online Voting System is ready for production.**
