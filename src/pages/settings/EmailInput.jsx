import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

import styles from './EmailInput.module.css';

export default function EmailInput() {
  const [toEmail, setToEmail] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const navigate = useNavigate();

  // Load current email values on mount
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const response = await axios.get('/api/email');
        if (response.data.length > 0) {
          const { to_email, cc, bcc } = response.data[0];
          setToEmail(to_email || '');
          setCc(cc || '');
          setBcc(bcc || '');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load email settings.');
      }
    };
    fetchEmails();
  }, []);

  const handleSetEmails = async () => {
    try {
      await axios.post('/api/email', { to_email: toEmail, cc, bcc });
      toast.success('Email settings saved successfully!');

      setTimeout(() => {
        navigate('/home');
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save email settings.');
    }
  };


  return (
    <>
      <Toaster position="bottom-center" reverseOrder={false} />
      <div className={styles['email-container']}>
        <div className={styles['email-box']}>
          <h2 className={styles['email-title']}>Email Settings</h2>
          <div className={styles['email-form']}>
            <label>Send to:</label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="Enter recipient email"
              className={styles.input}
            />

            <label>CC:</label>
            <input
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Enter CC email"
              className={styles.input}
            />

            <label>BCC:</label>
            <input
              type="email"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="Enter BCC email"
              className={styles.input}
            />

            <div className={styles['button-group']}>
              <button
                onClick={handleSetEmails}
                className={styles['save-btn']}
              >
                Save
              </button>
              <button
                onClick={() => navigate('/home')}
                className={styles['cancel-btn']}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
