import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

import styles from './Settings.module.css';

export default function Settings() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/change-password', {
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        toast.success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="bottom-center" reverseOrder={false} />
      <div className={styles['settings-container']}>
        <div className={styles['settings-box']}>
          <h2 className={styles['settings-title']}>Change Password</h2>
          <form onSubmit={handleSubmit} className={styles['settings-form']}>
            
            <label>Current Password</label>
            <div className={styles['password-wrapper']}>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={styles.input}
                disabled={loading}
              />
              {showCurrent ? (
                <FaEye
                  className={styles['eye-icon']}
                  onMouseUp={() => setShowCurrent(false)}
                  onMouseLeave={() => setShowCurrent(false)}
                />
              ) : (
                <FaEyeSlash
                  className={styles['eye-icon']}
                  onMouseDown={() => setShowCurrent(true)}
                />
              )}
            </div>

            <label>New Password</label>
            <div className={styles['password-wrapper']}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className={styles.input}
                disabled={loading}
              />
              {showNew ? (
                <FaEye
                  className={styles['eye-icon']}
                  onMouseUp={() => setShowNew(false)}
                  onMouseLeave={() => setShowNew(false)}
                />
              ) : (
                <FaEyeSlash
                  className={styles['eye-icon']}
                  onMouseDown={() => setShowNew(true)}
                />
              )}
            </div>

            <button
              type="submit"
              className={styles['settings-btn']}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className={styles['settings-btn']}
              onClick={() => navigate('/home')}
            >
              Back
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
