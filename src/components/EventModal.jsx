import React from "react";
import styles from "./EventModal.module.css";

export default function EventModal({ event, onClose, onSave }) {
  const [status, setStatus] = React.useState(event.status || "Unreviewed");

  const toggleStatus = () => {
    setStatus((prev) => (prev === "Suspicious" ? "Unreviewed" : "Suspicious"));
  };

  const handleSave = () => {
    onSave(status);
    onClose();
  };

  const imageSrc = event.imageUrl || event["image-path"] || null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h2>Event Details</h2>
        <p><strong>Timestamp:</strong> {event.timestamp}</p>
        <p><strong>Pose:</strong> {event.pose}</p>
        <p><strong>Confidence:</strong> {event.confidence}%</p>
        <p><strong>Status:</strong> {status}</p>

        {imageSrc && <img src={imageSrc} alt="Event" style={{ maxWidth: "100%", marginTop: "20px" }} />}

        <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
          <button onClick={toggleStatus} className={styles.buttonPrimary}>
            Toggle Status
          </button>
          <button onClick={handleSave} className={styles.buttonSave}>Save</button>
          <button onClick={onClose} className={styles.buttonSecondary}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
