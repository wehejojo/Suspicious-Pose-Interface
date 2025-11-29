import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";
import styles from "./NotificationModal.module.css";

export default function NotificationModal({
  open,
  message,
  imageSrc,
  onClose,
  autoCloseMs = 3000,
}) {
  useEffect(() => {
    if (!open || !autoCloseMs) return;

    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        <button className={styles.closeBtn} onClick={onClose}>
          <FiX size={22} />
        </button>

        <h2 className={styles.title}>Notification</h2>
        <p className={styles.message}>{message}</p>

        {imageSrc && (
          <img
            src={imageSrc}
            alt="Snapshot"
            className={styles.notificationImage}
          />
        )}

        <button className={styles.actionBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}