import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import NavBar from "../../components/NavBar";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis,
  YAxis, Tooltip, Legend, BarChart, Bar, CartesianGrid, ResponsiveContainer
} from "recharts";
import styles from "./Charts.module.css";

const COLORS = ["#0d47a1", "#1565c0", "#42a5f5", "#64b5f6", "#90caf9"];

export default function ChartsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axios.get("/api/suspicious_poses");
        setEvents(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const pieData = useMemo(() => {
    const suspicious = events.filter((e) => e.status === "Suspicious").length;
    const nonSuspicious = events.length - suspicious;
    return [
      { name: "Suspicious", value: suspicious },
      { name: "Non-Suspicious", value: nonSuspicious },
    ];
  }, [events]);

  const lineData = useMemo(() => {
    const grouped = {};
    events.forEach((e) => {
      const date = e.timestamp.split(" ")[0];
      if (!grouped[date]) grouped[date] = { date, suspicious: 0, normal: 0 };
      if (e.status === "Suspicious") grouped[date].suspicious++;
      else grouped[date].normal++;
    });
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events]);

  const poseData = useMemo(() => {
    const freq = {};
    events.forEach((e) => {
      if (!freq[e.pose]) freq[e.pose] = 0;
      freq[e.pose]++;
    });
    return Object.entries(freq)
      .map(([pose, count]) => ({ pose, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  const topSuspiciousPoses = useMemo(() => {
    const freq = {};
    events.filter(e => e.status === "Suspicious")
      .forEach(e => { freq[e.pose] = (freq[e.pose] || 0) + 1; });
    return Object.entries(freq)
      .map(([pose, count]) => ({ pose, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [events]);

  if (loading) {
    return (
      <div className={styles.chartsContainer}>
        <NavBar />
        <div className={styles.content}>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className={styles.chartsContainer}>
        <NavBar />
        <div className={styles.content}>
          <p>No events to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chartsContainer}>
      <NavBar />
      <div className={styles.content}>

        <div className={styles.grid}>
          {/* Pie Chart */}
          <div className={styles.card}>
            <h2 className={styles.subheading}>Suspicious vs Non-Suspicious</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}
          <div className={styles.card}>
            <h2 className={styles.subheading}>Events Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="suspicious" stroke="#d32f2f" />
                <Line type="monotone" dataKey="normal" stroke="#0d47a1" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pose Distribution */}
          <div className={styles.card}>
            <h2 className={styles.subheading}>Pose Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={poseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="pose" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count">
                  {poseData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Suspicious Poses */}
          <div className={styles.card}>
            <h2 className={styles.subheading}>Top Suspicious Poses</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart layout="vertical" data={topSuspiciousPoses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="pose" />
                <Tooltip />
                <Bar dataKey="count" fill="#d32f2f" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
