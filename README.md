# AI Interview Master

An AI-powered interview preparation platform that helps students and job seekers prepare for technical and HR interviews using artificial intelligence. The platform analyzes resumes, generates personalized interview questions, creates interview reports, and provides tailored preparation plans based on the candidate's profile and job description.

---

## Features

### Authentication
- User Registration
- User Login
- JWT Authentication
- Protected Routes
- Secure Session Management

### Resume Module
- Upload Resume (PDF/DOCX)
- Resume Parsing
- Resume Analysis

### AI Interview
- AI Interview Report Generation
- Technical Interview Questions
- Behavioral Interview Questions
- Match Score Analysis
- Skill Gap Detection
- Personalized Preparation Plan

### Resume Generator
- AI Resume Generation
- ATS-Friendly Resume
- PDF Download

### Dashboard
- User Dashboard
- Interview History
- Resume Management

---

## Tech Stack

### Frontend
- React
- Vite
- React Router
- SCSS
- Axios

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Multer
- Puppeteer

### AI
- Groq API
- OpenAI Compatible SDK

### Resume Processing
- pdf-parse
- Mammoth

---

## Project Structure

```
AI Interview Master
│
├── Frontend
│   ├── src
│   ├── components
│   ├── pages
│   ├── assets
│   ├── services
│   └── utils
│
├── Backend
│   ├── src
│   │   ├── controllers
│   │   ├── models
│   │   ├── routes
│   │   ├── middleware
│   │   ├── services
│   │   └── utils
│   ├── uploads
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/prashantmalagi/AI-Interview-Master.git
cd AI-Interview-Master
```

---

## Backend Setup

```bash
cd Backend

npm install

npm run dev
```

---

## Frontend Setup

```bash
cd Frontend

npm install

npm run dev
```

---

## Environment Variables

Create a `.env` file inside the Backend folder.

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key

GROQ_API_KEY=your_groq_api_key

GROQ_MODEL=llama-3.3-70b-versatile
```

---

## AI Features

The AI generates:

- Interview Match Score
- Technical Questions
- Behavioral Questions
- Skill Gap Analysis
- Preparation Roadmap
- ATS-Friendly Resume

---

## APIs

### Authentication

```
POST /api/auth/register
POST /api/auth/login
```

### Resume

```
POST /api/resume/upload
```

### Interview

```
POST /api/interview/generate
```

### Resume PDF

```
POST /api/resume/pdf
```

---

## Future Roadmap

### Phase 1
- User Authentication
- Resume Upload
- AI Interview Report
- Resume PDF Download
- Dashboard
- Protected Routes

### Phase 2
- ATS Resume Checker
- Job Description Analyzer
- Company-Specific Interviews
- Role-Based Interviews

### Phase 3
- Coding Interview Platform
- Voice-Based AI Interview
- Performance Analytics
- AI Learning Roadmap

### Phase 4
- Leaderboard
- Certificates
- Email Reports
- Admin Dashboard

---

## Security

- JWT Authentication
- Password Hashing
- Protected APIs
- File Validation
- Environment Variables
- Secure Database Access

---


## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a new feature branch.
3. Commit your changes.
4. Push the branch.
5. Open a Pull Request.

---

## Author

**Prashant Malagi**

GitHub:
https://github.com/prashantmalagi

LinkedIn:
www.linkedin.com/in/prashanthmalagi

---

## License

This project is licensed under the MIT License.
