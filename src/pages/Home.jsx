import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaHeartbeat, FaChartLine, FaExclamationTriangle } from 'react-icons/fa';
import './Home.css';

export default function Home() {
  const [health, setHealth] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/health')
      .then(res => setHealth(res.data))
      .catch(err => console.error(err));
  }, []);

  const isHealthy = health?.status?.toLowerCase() === 'up' || health?.status?.toLowerCase() === 'healthy';

  return (
    <div className="home-container">
      <div className="background-overlay" />   {/* ← visual depth */}

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="glass-card"
      >
        <header className="home-header">
          <motion.h1
            initial={{ backgroundPosition: '0% 50%' }}
            animate={{ backgroundPosition: '100% 50%' }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="gradient-text"
          >
            John Erick
          </motion.h1>

          <div className="health-status">
            {/* <FaHeartbeat className={`heartbeat ${isHealthy ? 'healthy' : 'down'}`} /> */}
            <span>Server Status: </span>
            <motion.span 
              className={`status ${isHealthy ? 'healthy' : 'down'}`}
              animate={isHealthy ? { opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {health ? health.status : "Checking..."}
            </motion.span>
          </div>
        </header>

        <div className="button-group">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/latest')}
            className="btn btn-primary"
          >
            <FaChartLine className="icon" />
            Latest
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/violations')}
            className="btn btn-danger"
          >
            <FaExclamationTriangle className="icon" />
            Violations
          </motion.button>
        </div>
      </motion.div>

      <footer className="home-footer">
        <p>© 2025 My Dashboard — Running at peak</p>
      </footer>
    </div>
  );
}