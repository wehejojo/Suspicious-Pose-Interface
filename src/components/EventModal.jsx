import React from "react";
import styles from "./EventModal.module.css";

export default function EventModal({ event, onClose, onSave, onDelete }) {
  const [status, setStatus] = React.useState(event.status || "Unreviewed");

  const handleSave = () => {
    onSave(status);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      onDelete(event.id);
      onClose();
    }
  };

  const imageSrc = event.imageUrl || event["image-path"] || null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h2>Event Details</h2>
        <p><strong>Timestamp:</strong> {event.timestamp}</p>
        <p><strong>Pose:</strong> {event.pose}</p>
        <p><strong>Confidence:</strong> {event.confidence}%</p>
        <p>
          <strong>Status:</strong>{" "}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Unreviewed">Unreviewed</option>
            <option value="Suspicious">Suspicious</option>
            <option value="Not Suspicious">Not Suspicious</option>
          </select>
        </p>

        {imageSrc && (
          <img
            src={imageSrc}
            alt="Event"
            style={{ maxWidth: "100%", marginTop: "20px" }}
          />
        )}

        <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
          <button onClick={handleSave} className={styles.buttonSave}>
            Save
          </button>
          <button onClick={onClose} className={styles.buttonSecondary}>
            Cancel
          </button>
          {/* <button
            onClick={handleDelete}
            className={styles.buttonDelete}
          >
            Delete
          </button> */}
        </div>
      </div>
    </div>
  );
}
