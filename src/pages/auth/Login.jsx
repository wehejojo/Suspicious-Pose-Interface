import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';

import styles from './Login.module.css';

export default function Login() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/login', { password });

      if (response.data.success) {
        const redirect_endpoint = response.data['redirect-endpoint'];
        navigate(`${redirect_endpoint}`);
      }
    } catch (err) {
      if (err.response) {
        alert(`Login Failed: ${err.response.data.error}`);
      } else {
        alert(`Error during login: ${err.message}`);
      }
      setPassword('');
    }
  };

  return (
    <div className={styles['login-container']}>
      <div className={styles['login-box']}>
        <h2 className={styles['login-title']}>John Erick</h2>
        <form onSubmit={handleSubmit} className={styles['login-form']}>
          <label>Password</label>
          <div className={styles['password-wrapper']}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className={styles.input}
            />
            {showPassword ? (
              <FaEye
                className={styles['eye-icon']}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
              />
            ) : (
              <FaEyeSlash
                className={styles['eye-icon']}
                onMouseDown={() => setShowPassword(true)}
              />
            )}
          </div>
          <button type="submit" className={styles['login-btn']}>Login</button>
        </form>
      </div>
    </div>
  );
}
