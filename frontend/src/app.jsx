import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';

// You will need to create these components in your src/pages/ folder later
const Login = () => <div>Login Page (Firebase Auth)</div>;
const Dashboard = () => <div>Dashboard Gauge Page</div>;
const LogToday = () => <div>3-Step Habit Logger Page</div>;
const History = () => <div>History & Trends Charts Page</div>;
const Suggestions = () => <div>AI Suggestions Page</div>;
const Achievements = () => <div>Badges Page</div>;
const Profile = () => <div>Settings Page</div>;

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-green-50 text-gray-900">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<LogToday />} />
          <Route path="/history" element={<History />} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;