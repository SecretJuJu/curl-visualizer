# CURL Visualizer & JWT Tools

A web-based tool for visualizing CURL commands and handling JWT tokens with an intuitive interface.

## Features

**1. CURL Visualization**  
- Parses and visualizes CURL commands in a user-friendly format.  
- Displays HTTP method, URL, headers, and request body.  
- Allows sending requests directly from the interface.  
- Shows response status code, response time, and response body.

**2. JWT Tools**  
- **JWT Token Generation (Encoding):**  
  - Input payload in JSON format.  
  - Set a secret key.  
  - Choose an algorithm (HS256, HS384, HS512).  
  - Option to automatically set expiration time.  
- **JWT Token Verification (Decoding):**  
  - Decode tokens to view the payload.  
  - Verify the signature using the secret key.  
  - Display verification status.

**3. Request Management**  
- Save frequently used requests.  
- View a list of saved requests.  
- Edit and delete requests.  
- Load saved requests for reuse.

## Tech Stack

**Frontend:**  
- HTML, CSS, and JavaScript.  
- Pure JavaScript SPA implementation.

**Backend:**  
- Python 3.9+ with Flask framework.  
- PyJWT for token handling.  
- SQLite for request storage.

## Installation & Running

1. **Requirements:**  
   - Docker and Docker Compose  
   - Alternatively, Python 3.9+ and Poetry

2. **Run with Docker:**  
   Build and run the container using:  
   docker-compose up --build

3. **Run Locally with Poetry:**  
   - Install Poetry:  
     curl -sSL https://install.python-poetry.org | python3 -  
   - Install dependencies:  
     poetry install  
   - Run the application:  
     poetry run python app.py

4. **Access the Application:**  
   Open your browser and navigate to http://localhost:8282

## Development Setup

- **Code Formatting:**  
  poetry run black .

- **Linting:**  
  poetry run flake8

- **Testing:**  
  poetry run pytest

## Data Storage

- Request data is stored in an SQLite database.  
- The database file is located at /data/requests.db.  
- Data persistence is managed through Docker volumes.

## Project Structure

.
├── app.py               (Main Flask application file)  
├── static/              
│   ├── script.js        (Frontend JavaScript)  
│   └── styles.css       (CSS styles for UI)  
├── templates/           
│   └── index.html       (Main HTML template)  
├── docker-compose.yml   (Docker Compose configuration)  
├── Dockerfile           (Docker build instructions)  
└── pyproject.toml       (Poetry project configuration)

## License

This project is licensed under the MIT License.
