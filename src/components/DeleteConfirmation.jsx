import React from "react";
import { MdClose } from "react-icons/md";
import styles from "./DeleteConfirmation.module.css";

export default function DeleteConfirmation({ open, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onCancel}>
          <MdClose size={20} />
        </button>

        <h2 className={styles.title}>Delete All Logs?</h2>

        <p className={styles.message}>
          Are you sure you want to delete all suspicious pose logs?
          <br />
          This action cannot be undone.
        </p>

        <div className={styles.buttons}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>

          <button className={styles.deleteBtn} onClick={onConfirm}>
            Delete All
          </button>
        </div>
      </div>
    </div>
  );
}
