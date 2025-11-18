// src/pages/Violations.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FaExclamationTriangle,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaSkullCrossbones,
  FaAngry,
  FaFrown,
  FaTimes,
} from 'react-icons/fa';
import { useState } from 'react';
import './Home.css';

// Same mock data – newest first
const mockViolations = [
  {
    id: 1,
    date: '2025-11-18',
    time: '14:32',
    type: 'Overspeed',
    severity: 'high',
    description: 'Vehicle exceeded speed limit by 42 km/h in restricted zone',
    location: 'Highway A12 - Sector 7',
    evidence: 'Camera #A12-47 ∙ Video + Photo available',
  },
  {
    id: 2,
    date: '2025-11-17',
    time: '09:15',
    type: 'Red Light Violation',
    severity: 'high',
    description: 'Failed to stop at red signal',
    location: 'Downtown Intersection',
    evidence: 'Camera #DT-12 ∙ Photo available',
  },
  {
    id: 3,
    date: '2025-11-16',
    time: '22:47',
    type: 'Unauthorized Zone Entry',
    severity: 'medium',
    description: 'Entered restricted area without clearance',
    location: 'Sector 9 Restricted Zone',
    evidence: 'Gate sensor + Camera',
  },
  {
    id: 4,
    date: '2025-11-15',
    time: '06:20',
    type: 'Reckless Lane Change',
    severity: 'medium',
    description: 'Multiple unsafe lane changes detected',
    location: 'Ring Road East',
    evidence: 'Dashcam analysis',
  },
  {
    id: 5,
    date: '2025-11-14',
    time: '19:03',
    type: 'Parking Violation',
    severity: 'low',
    description: 'Parked in no-parking zone for 47 minutes',
    location: 'Central Plaza',
    evidence: 'Parking sensor',
  },
];

export default function Violations() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const highCount = mockViolations.filter(v => v.severity === 'high').length;
  const mediumCount = mockViolations.filter(v => v.severity === 'medium').length;
  const lowCount = mockViolations.filter(v => v.severity === 'low').length;

  return (
    <div className="home-container violations-page">
      <div className="background-overlay" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9 }}
        className="glass-card"
      >
        <motion.h1
          initial={{ backgroundPosition: '0% 50%' }}
          animate={{ backgroundPosition: '100% 50%' }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="gradient-text violations-gradient"
        >
          Violations
        </motion.h1>

        {/* Stats */}
        <div className="stats-grid">
          <motion.div whileHover={{ scale: 1.05 }} className="stat-card high">
            <FaSkullCrossbones className="stat-icon" />
            <p>Total</p>
            <h2>{mockViolations.length}</h2>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="stat-card high">
            <FaAngry className="stat-icon" />
            <p>High</p>
            <h2>{highCount}</h2>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="stat-card medium">
            <FaExclamationTriangle className="stat-icon" />
            <p>Medium</p>
            <h2>{mediumCount}</h2>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="stat-card low">
            <FaFrown className="stat-icon" />
            <p>Low</p>
            <h2>{lowCount}</h2>
          </motion.div>
        </div>

        {/* Clickable compact cards */}
        <div className="violations-grid">
          {mockViolations.map((violation, index) => (
            <motion.div
              key={violation.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(239,68,68,0.35)' }}
              onClick={() => setSelected(violation)}
              className={`violation-compact-card ${violation.severity}`}
            >
              <div className="compact-header">
                <div className="compact-title">
                  <FaExclamationTriangle className={`compact-icon ${violation.severity}`} />
                  <div>
                    <h3>{violation.type}</h3>
                    <p className="compact-meta">
                      {violation.date} ∙ {violation.time}
                    </p>
                  </div>
                </div>
                <span className={`severity-badge ${violation.severity}`}>
                  {violation.severity.toUpperCase()}
                </span>
              </div>
              <p className="compact-location">{violation.location}</p>
            </motion.div>
          ))}
        </div>

        {/* Back button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="btn btn-back"
        >
          ← Back to Dashboard
        </motion.button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="modal-backdrop"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="violation-modal glass-card"
            >
              <button onClick={() => setSelected(null)} className="modal-close">
                <FaTimes />
              </button>

              <div className={`modal-severity-bar ${selected.severity}`} />

              <h2>{selected.type}</h2>
              <span className={`severity-badge large ${selected.severity}`}>
                {selected.severity.toUpperCase()} SEVERITY
              </span>

              <div className="modal-details">
                <div className="detail-row">
                  <FaCalendarAlt />
                  <span>Date</span>
                  <strong>{selected.date}</strong>
                </div>
                <div className="detail-row">
                  <FaClock />
                  <span>Time</span>
                  <strong>{selected.time}</strong>
                </div>
                <div className="detail-row">
                  <FaMapMarkerAlt />
                  <span>Location</span>
                  <strong>{selected.location}</strong>
                </div>
                <div className="detail-row evidence">
                  <span>Evidence</span>
                  <strong>{selected.evidence}</strong>
                </div>
              </div>

              <div className="modal-description">
                <h4>Description</h4>
                <p>{selected.description}</p>
              </div>

              <button className="btn btn-primary modal-action">
                View Evidence
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <footer className="home-footer">
        <p>© 2025 My Dashboard — Drive safe</p>
      </footer>
    </div>
  );
}