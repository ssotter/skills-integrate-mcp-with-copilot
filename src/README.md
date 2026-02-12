# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Register and log in users
- Role-based access control (`admin`, `activity-manager`, `student`)
- Only `admin` and `activity-manager` can register/unregister students in activities

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| POST   | `/auth/register`                                                  | Register a user (default role: `student`)                           |
| POST   | `/auth/login`                                                     | Log in and receive bearer token                                     |
| POST   | `/auth/logout`                                                    | Invalidate current session token                                    |
| GET    | `/auth/me`                                                        | Get current authenticated user                                      |
| GET    | `/activities`                                                     | Get all activities (requires login)                                 |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Register a student in an activity (admin/manager only)             |
| DELETE | `/activities/{activity_name}/unregister?email=student@...`        | Unregister a student (admin/manager only)                           |

## Default Test Accounts

- `admin@mergington.edu` / `admin123`
- `manager@mergington.edu` / `manager123`
- `student@mergington.edu` / `student123`

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.
