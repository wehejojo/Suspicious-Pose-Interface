import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

import styles from './Home.module.css';

export default function Home() {
  const navigate = useNavigate();
  const toastDisplayed = useRef(false);

  useEffect(() => {
    if (!toastDisplayed.current) {
      toast.success("Logged in.");
      toastDisplayed.current = true;
    }
  }, []);

  const handleLogout = () => {
    toast.success("Logged out.", {
      duration: 1000,
      icon: '🚪',
      style: { fontWeight: '500' },
      position: 'bottom-center'
    });

    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  return (
    <>
      <Toaster position="bottom-center" reverseOrder={false} />

      <div className={styles['home-container']}>
        <div className={styles['home-box']}>
          <div className={styles['home-header']}>
            <h2 className={styles['home-title']}>Welcome, John Erick</h2>
            <FaSignOutAlt className={styles['logout-icon']} onClick={handleLogout} />
          </div>

          <div className={styles['home-buttons']}>
            <button onClick={() => navigate('/dashboard')} className={styles['home-btn']}>Dashboard</button>
            <button onClick={() => navigate('/charts')} className={styles['home-btn']}>Charts</button>
            <button onClick={() => navigate('/feed')} className={styles['home-btn']}>Live Feed</button>
          </div>
        </div>
      </div>
    </>
  );
}
