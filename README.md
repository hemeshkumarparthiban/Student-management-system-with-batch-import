# 🎓 EduTrack — Student Data Management System

A full-stack Student Data Management System built with **React.js**, **Node.js**, and **MySQL**.

---

## Features

- ✅ **Student CRUD** — Create, Read, Update, Delete students
- ✅ **Search & Filter** — Real-time search with sorting and pagination
- ✅ **Batch CSV Import** — Upload multiple CSV files in parallel
- ✅ **Data Validation** — Row-level validation with detailed error reports
- ✅ **Import Job Tracking** — Real-time progress monitoring per file
- ✅ **Course Management** — Full CRUD for courses
- ✅ **Enrollment Tracking** — Link students to courses with grades
- ✅ **Dashboard** — Live stats overview
- ✅ **Dark Theme UI** — Modern, responsive design

---

## Tech Stack

| Layer     | Technology                         |
|-----------|-----------------------------------|
| Frontend  | React 18, React Router v6, Axios  |
| Backend   | Node.js, Express.js               |
| Database  | MySQL 8+                          |
| CSV Parse | csv-parse, Multer                 |
| Styling   | Custom CSS (no UI framework)      |

---

## Prerequisites

- Node.js 18+
- MySQL 8+
- npm or yarn

---

## Setup Instructions

### 1. Database Setup

Start MySQL and create the database:

```sql
CREATE DATABASE student_mgmt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> Tables are created automatically when the backend starts.

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=student_mgmt
```

Start the backend:

```bash
npm run dev     # development (with nodemon)
npm start       # production
```

The API will be available at `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will open at `http://localhost:3000`

---

## API Reference

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | List students (with search, sort, pagination) |
| GET | `/api/students/:id` | Get student + enrollments |
| POST | `/api/students` | Create student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |
| POST | `/api/students/:id/enrollments` | Add enrollment |

### Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/import/upload` | Upload CSV files (up to 10, parallel) |
| GET | `/api/import/status/:jobId` | Get job status |
| GET | `/api/import/jobs` | List all jobs |
| GET | `/api/import/template` | Download sample CSV |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List all courses |
| POST | `/api/courses` | Create course |
| PUT | `/api/courses/:id` | Update course |
| DELETE | `/api/courses/:id` | Delete course |

---

## CSV Import Format

Required columns: `student_id`, `first_name`, `last_name`, `email`

Optional: `phone`, `date_of_birth` (YYYY-MM-DD), `gender` (Male/Female/Other), `address`

```csv
student_id,first_name,last_name,email,phone,date_of_birth,gender,address
STU001,John,Doe,john.doe@example.com,+1234567890,2000-01-15,Male,"123 Main St"
STU002,Jane,Smith,jane.smith@example.com,,2001-03-22,Female,
```

> Download the template from the app: **Batch Import → Download Template**

---

## Project Structure

```
student-mgmt/
├── backend/
│   ├── config/
│   │   └── database.js        # MySQL pool + table init
│   ├── routes/
│   │   ├── students.js        # CRUD + search
│   │   ├── import.js          # CSV batch import
│   │   └── courses.js         # Course CRUD
│   ├── server.js              # Express app entry
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── StudentModal.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Students.jsx
│   │   │   ├── Import.jsx
│   │   │   └── Courses.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
└── README.md
```
