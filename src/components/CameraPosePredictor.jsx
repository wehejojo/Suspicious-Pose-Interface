import React, { useRef, useEffect, useState } from "react";
import * as posedetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import emailjs from "@emailjs/browser";
import { io } from "socket.io-client";
import axios from "axios";
import styles from "./CameraPosePredictor.module.css";

export default function CameraPosePredictor2() {
  // imgRef (previously videoRef) points to the MJPEG <img />
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const snapshotCanvasRef = useRef(null);

  // persistent refs for timings and detector
  const lastSnapshotTimeRef = useRef({});
  const emailSentRef = useRef({});
  const detectorRef = useRef(null);
  const socketRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  const [pose, setPose] = useState("Neutral");

  // email setting state (preloaded from backend)
  const [toEmail, setToEmail] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");

  // constants
  const SNAPSHOT_COOLDOWN = 5000; // ms
  const EMAIL_COOLDOWN = 5000; // ms
  const ESTIMATE_INTERVAL = 100; // ms

  const SERVICE_ID = "service_yv310xd";
  const TEMPLATE_ID = "template_dpg783k";
  const PUBLIC_KEY = "CLvTgPmSeNo37nrfI";

  // load saved email config once
  useEffect(() => {
    let cancelled = false;
    async function fetchEmails() {
      try {
        const res = await axios.get("/api/email");
        if (!cancelled && Array.isArray(res.data) && res.data.length > 0) {
          const { to_email, cc: ccVal, bcc: bccVal } = res.data[0];
          setToEmail(to_email || "");
          setCc(ccVal || "");
          setBcc(bccVal || "");
        }
      } catch (err) {
        console.error("Failed to load email settings", err);
      }
    }
    fetchEmails();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    let lastEstimateTime = 0;

    const createSnapshotCanvas = (w = 640, h = 480) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      snapshotCanvasRef.current = c;
      return c;
    };

    createSnapshotCanvas(640, 480);

    let isUnmounted = false;

    async function initDetector() {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const detector = await posedetection.createDetector(
          posedetection.SupportedModels.MoveNet,
          { modelType: "SinglePose.Lightning" }
        );
        detectorRef.current = detector;
      } catch (err) {
        console.error("Failed to initialize MoveNet detector:", err);
      }
    }

    initDetector();

    const onPoseFromServer = (data) => {
      if (!data.confidences) return;

      const entries = [
        { label: "Left Punch", value: data.confidences.left_punch },
        { label: "Right Punch", value: data.confidences.right_punch },
        { label: "Left Kick", value: data.confidences.left_kick },
        { label: "Right Kick", value: data.confidences.right_kick },
        { label: "Lying Down", value: data.confidences.lying },
        { label: "Holding Firearm", value: data.confidences.firearm },
      ];

      const highest = entries.reduce((max, e) => (e.value > max.value ? e : max), {
        label: "Neutral",
        value: 0,
      });

      setPose(`${highest.label} (${(highest.value * 100).toFixed(0)}%)`);

      const now = Date.now();
      const lastTime = lastSnapshotTimeRef.current[highest.label] || 0;

      if (highest.value >= 0.8 && now - lastTime > SNAPSHOT_COOLDOWN) {
        lastSnapshotTimeRef.current[highest.label] = now;

        try {
          const img = videoRef.current;
          const snapCanvas = snapshotCanvasRef.current;
          if (!img || !snapCanvas) return;

          const w = img.naturalWidth || snapCanvas.width || 640;
          const h = img.naturalHeight || snapCanvas.height || 480;
          if (snapCanvas.width !== w || snapCanvas.height !== h) {
            snapCanvas.width = w;
            snapCanvas.height = h;
          }

          const snapCtx = snapCanvas.getContext("2d");
          snapCtx.clearRect(0, 0, snapCanvas.width, snapCanvas.height);
          snapCtx.drawImage(img, 0, 0, snapCanvas.width, snapCanvas.height);

          const snapshot = snapCanvas.toDataURL("image/png");

          socket.emit("high_confidence_pose", {
            keypoints: data.keypoints,
            pose: highest.label,
            confidence: highest.value,
            snapshot,
          });

          const lastEmailTime = emailSentRef.current[highest.label] || 0;
          if (now - lastEmailTime > EMAIL_COOLDOWN) {
            emailSentRef.current[highest.label] = now;

            const PAYLOAD = {
              pose: highest.label,
              confidence: (highest.value * 100).toFixed(1),
              from_name: "CCTV System",
              to_email: toEmail,
              cc: cc,
              bcc: bcc,
            };

            emailjs
              .send(SERVICE_ID, TEMPLATE_ID, PAYLOAD, PUBLIC_KEY)
              .then(() => console.log(`Alert email sent for ${highest.label}`))
              .catch((err) => console.error("Email send failed:", err));
          }
        } catch (err) {
          console.error("Failed to capture/send snapshot:", err);
        }
      }
    };

    socket.on("pose", onPoseFromServer);

    async function loop() {
      try {
        const now = performance.now();
        if (detectorRef.current && now - lastEstimateTime > ESTIMATE_INTERVAL) {
          const img = videoRef.current;
          const canvas = canvasRef.current;
          if (img && canvas && img.complete && img.naturalWidth > 0) {
            if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
            }

            const poses = await detectorRef.current.estimatePoses(img);
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (Array.isArray(poses) && poses.length > 0) {
              const keypoints = poses[0].keypoints;
              drawSkeleton(ctx, keypoints);

              socket.emit("keypoints", {
                keypoints: keypoints.map((k) => [k.x, k.y]),
              });
            }
          }
          lastEstimateTime = now;
        }
      } catch (err) {
        console.error("Loop error:", err);
      } finally {
        animationFrameIdRef.current = requestAnimationFrame(loop);
      }
    }

    const startWhenReady = () => {
      const img = videoRef.current;
      const canvas = canvasRef.current;
      if (!img || !canvas) return;

      img.onload = () => {
        try {
          const snapCanvas = snapshotCanvasRef.current;
          const w = img.naturalWidth || 640;
          const h = img.naturalHeight || 480;

          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          if (snapCanvas && (snapCanvas.width !== w || snapCanvas.height !== h)) {
            snapCanvas.width = w;
            snapCanvas.height = h;
          }

          if (detectorRef.current && !animationFrameIdRef.current) {
            animationFrameIdRef.current = requestAnimationFrame(loop);
          }
        } catch (err) {
          console.error("img.onload handler error:", err);
        }
      };

      if (img && img.complete && img.naturalWidth > 0) {
        img.onload?.();
      }
    };

    const detectorPoll = setInterval(() => {
      if (detectorRef.current) {
        clearInterval(detectorPoll);
        startWhenReady();
      }
    }, 100);

    return () => {
      isUnmounted = true;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.off("pose", onPoseFromServer);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (detectorRef.current?.dispose) {
        try {
          detectorRef.current.dispose();
        } catch (err) {
          console.error(err);
        }
      }
      clearInterval(detectorPoll);
    };
  }, [toEmail, cc, bcc]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Real-Time Pose Detection (IP Camera)</h1>

      <img
        ref={videoRef}
        src="/api/ipcam_stream"
        className={styles.video}
        alt="IP Camera Stream"
        crossOrigin="anonymous"
      />

      <canvas ref={canvasRef} className={styles.canvas} />

      <h2 className={styles.poseLabel}>Pose: {pose}</h2>
    </div>
  );
}

function drawSkeleton(ctx, keypoints) {
  const adjacentPairs = [
    [5, 7],
    [7, 9],
    [6, 8],
    [8, 10],
    [5, 6],
    [5, 11],
    [6, 12],
    [11, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
  ];

  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;

  keypoints.forEach((kp) => {
    if (kp.score != null && kp.score > 0.3) {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  adjacentPairs.forEach(([i, j]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];
    if (
      kp1 &&
      kp2 &&
      kp1.score != null &&
      kp2.score != null &&
      kp1.score > 0.3 &&
      kp2.score > 0.3
    ) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  });
}
