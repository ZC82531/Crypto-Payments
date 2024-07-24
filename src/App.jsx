import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import FinishSignup from './finish-signup';
import Dashboard from './dashboard'
import CustomerPage from './CustomerPage'
import PaymentPage from './PaymentPage';


function App() {
  return (
    <Router>
      <div className="app">

        <Routes>
          <Route path="/" element={<Login to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/finish-signup" element={<FinishSignup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/:username" element={<CustomerPage />} />
          <Route path="/payment" element={<PaymentPage />} />
        </Routes>

      </div>
    </Router>
  );
}

export default App;
