import axios from "axios";
import { useEffect, useState, useMemo, useRef } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { MdDelete, MdOutlineFileDownload } from "react-icons/md";
import toast, { Toaster } from 'react-hot-toast';
import { io } from 'socket.io-client';

import NavBar from "../../components/NavBar";
import EventModal from "../../components/EventModal";
import NotificationModal from "../../components/NotificationModal";
import DeleteConfirmation from "../../components/DeleteConfirmation";

import styles from "./Dashboard.module.css";

const socket = io("http://localhost:5000");

const KpiCard = ({ label, value }) => (
  <div className={styles.card}>
    <div className={styles.kpiLabel}>{label}</div>
    <div className={styles.kpiValue}>{value}</div>
  </div>
);

const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};


export default function DashboardPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEvent, setModalEvent] = useState(null);
  const [latestEvent, setLatestEvent] = useState(null);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationImage, setNotificationImage] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(null);

  const lastAlertedTimestamp = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsRes, latestRes] = await Promise.all([
        axios.get("/api/suspicious_poses"),
        axios.get("/api/latest"),
      ]);

      const normalizedEvents = eventsRes.data.map(e => ({
        ...e,
        status: capitalize(e.status),
        imageUrl: e["image-path"] ? `http://localhost:5000/imgs/${e["image-path"]}` : null
      }));

      setEvents(normalizedEvents);
      setLatestEvent({
        ...latestRes.data,
        status: capitalize(latestRes.data.status)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleSaveStatus = async (newStatus) => {
    if (!modalEvent) return;

    const capitalizedStatus = capitalize(newStatus);

    try {
      await axios.patch(`/api/suspicious_poses/${modalEvent.id}`, {
        status: capitalizedStatus,
      });

      setEvents((prev) =>
        prev.map((e) =>
          e.id === modalEvent.id ? { ...e, status: capitalizedStatus } : e
        )
      );

      if (
        latestEvent &&
        latestEvent.timestamp === modalEvent.timestamp &&
        latestEvent.pose === modalEvent.pose
      ) {
        setLatestEvent((prev) => ({ ...prev, status: capitalizedStatus }));
      }

      setModalEvent(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await axios.delete('/api/suspicious_poses');
      await fetchData();
      toast.success("All logs deleted");
    } catch (err) {
      toast.error('Something went wrong.');
      console.error(err);
    } finally {
      setShowDeleteConfirmation(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get("/api/export", {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "suspicious_logs.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        toast.success("Report downloaded");
      }, 2000);
    } catch (err) {
      toast.error("Failed to download report");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join", "dashboard");
      console.log("Joined dashboard room");
    });

    socket.on("alert", (data) => {
      console.log("Received alert:", data);

      if (data.timestamp !== lastAlertedTimestamp.current) {
        lastAlertedTimestamp.current = data.timestamp;
        setNotificationMsg(`Pose detected: ${data.pose} (Confidence: ${(data.confidence * 100).toFixed(1)}%)`);
        setNotificationImage(`http://localhost:5000/imgs/${data["image-path"]}`);

        setShowNotification(true);
        fetchData();
      }
    });

    return () => {
      socket.off("connect");
      socket.off("alert");
    };
  }, []);


  const suspiciousToday = useMemo(
    () => events.filter((e) => e.status === "Suspicious").length,
    [events]
  );

  const notSuspiciousEvents = useMemo(
    () => events.filter((e) => e.status === "Not Suspicious").length,
    [events]
  );

  const unreviewedEvents = useMemo(
    () => events.filter((e) => e.status === "Unreviewed").length,
    [events]
  );

  return (
    <>
      <Toaster position="bottom-center" reverseOrder={false} />
      <div className={styles.dashboardContainer}>
        <NavBar />
        <div className={styles.content}>
          <h1 className={styles.heading}>Dashboard</h1>

          <div className={styles.kpiRow}>
            <KpiCard label="Suspicious Events Today" value={suspiciousToday} />
            <KpiCard label="Not Suspicious Events" value={notSuspiciousEvents} />
            <KpiCard label="Unreviewed Events" value={unreviewedEvents} />
            {latestEvent && (
              <div className={styles.card}>
                <div className={styles.kpiLabel}>Latest Event</div>
                <div className={styles.kpiValue} style={{ fontSize: "1rem" }}>
                  {latestEvent.pose || "N/A"}
                </div>
                <div className={styles.kpiLabel}>{latestEvent.timestamp || "N/A"}</div>
              </div>
            )}
          </div>

          <div className={styles.eventSection}>
            <div className={styles.tableHeader}>
              <h2 className={styles.subheading}>Recent Events</h2>
              <div className={styles.utilContainer}>
                <button
                  className={styles.buttonPrimary}
                  onClick={fetchData}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <FiRefreshCw />
                  Refresh
                </button>
                <button
                  className={styles.buttonPrimary}
                  onClick={handleDownload}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <MdOutlineFileDownload />
                  Download Report
                </button>
                <button
                  className={styles.buttonPrimary}
                  onClick={() => setShowDeleteConfirmation(true)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <MdDelete />
                  Delete all
                </button>
              </div>
            </div>

            {loading ? (
              <p className={styles.loading}>Loading...</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Pose</th>
                      <th>Confidence</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td>{event.timestamp || "N/A"}</td>
                        <td>{event.pose || "N/A"}</td>
                        <td>
                          {event.confidence !== undefined && event.confidence !== null
                            ? `${event.confidence}%`
                            : "N/A"}
                        </td>
                        <td>{event.status || "N/A"}</td>
                        <td>
                          <button
                            className={styles.buttonPrimary}
                            onClick={() => setModalEvent(event)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {modalEvent && (
            <EventModal
              event={modalEvent}
              onClose={() => setModalEvent(null)}
              onSave={handleSaveStatus}
            />
          )}
        </div>
        <NotificationModal
          open={showNotification}
          message={notificationMsg}
          imageSrc={notificationImage}
          onClose={() => setShowNotification(false)}
          autoCloseMs={3000}
        />
        <DeleteConfirmation
          open={showDeleteConfirmation}
          onCancel={() => setShowDeleteConfirmation(false)}
          onConfirm={handleDeleteAll}
        />
      </div>
    </>
  );
}
