import React, { useRef, useEffect, useState } from "react";
import * as posedetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import emailjs from "@emailjs/browser";
import { io } from "socket.io-client";
import axios from 'axios';
import styles from "./CameraPosePredictor.module.css";

export default function CameraPosePredictor2() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // const snapshotCanvasRef = useRef(null);
  const emailSentRef = useRef({});
  const [pose, setPose] = useState("Neutral");

  const [toEmail, setToEmail] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");

  const lastSnapshotTime = {};
  const SNAPSHOT_COOLDOWN = 5000;

  const SERVICE_ID = "service_yv310xd";
  const TEMPLATE_ID = "template_dpg783k";
  const PUBLIC_KEY = "CLvTgPmSeNo37nrfI";

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const response = await axios.get("/api/email");
        if (response.data.length > 0) {
          const { to_email, cc, bcc } = response.data[0];
          setToEmail(to_email || "");
          setCc(cc || "");
          setBcc(bcc || "");
        }
      } catch (err) {
        console.error("Failed to load email settings", err);
      }
    };
    fetchEmails();
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:5000");

    let detector = null;
    let animationFrameId = null;
    const lastEstimateTime = { current: 0 };
    const ESTIMATE_INTERVAL = 100;

    const snapCanvas = document.createElement("canvas");
    const snapCtx = snapCanvas.getContext("2d");

    const img = videoRef.current;
    const canvas = canvasRef.current;

    if (!img || !canvas) return;

    async function init() {
      await tf.setBackend("webgl");
      await tf.ready();

      try {
        detector = await posedetection.createDetector(
          posedetection.SupportedModels.MoveNet,
          {
            modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            modelUrl: "/movenet-tfjs-singlepose-lightning-v4/model.json",
          }
        );
        console.log("MoveNet loaded successfully from local files!");
      } catch (err) {
        console.error("Failed to initialize MoveNet detector:", err);
        return;
      }

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        snapCanvas.width = img.naturalWidth;
        snapCanvas.height = img.naturalHeight;

        loop();
      };
    }

    async function loop() {
      const now = performance.now();

      if (now - lastEstimateTime.current > ESTIMATE_INTERVAL) {
        if (img.complete && img.naturalWidth > 0 && detector) {
          const poses = await detector.estimatePoses(img);
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (poses.length > 0) {
            const keypoints = poses[0].keypoints;
            drawSkeleton(ctx, keypoints);

            // Send keypoints to server
            socket.emit("keypoints", {
              keypoints: keypoints.map((k) => [k.x, k.y]),
            });
          }
        }

        lastEstimateTime.current = now;
      }

      animationFrameId = requestAnimationFrame(loop);
    }

    // Handle server-sent pose events
    socket.on("pose", (data) => {
      if (!data.confidences) return;

      const entries = [
        { label: "Left Punch", value: data.confidences.left_punch },
        { label: "Right Punch", value: data.confidences.right_punch },
        { label: "Left Kick", value: data.confidences.left_kick },
        { label: "Right Kick", value: data.confidences.right_kick },
        { label: "Lying Down", value: data.confidences.lying },
        { label: "Holding Firearm", value: data.confidences.firearm },
      ];

      const highest = entries.reduce((max, entry) =>
        entry.value > max.value ? entry : max
      );

      setPose(`${highest.label} (${(highest.value * 100).toFixed(0)}%)`);

      const now = Date.now();
      const lastTime = lastSnapshotTime[highest.label] || 0;

      if (highest.value >= 0.8 && now - lastTime > SNAPSHOT_COOLDOWN) {
        lastSnapshotTime[highest.label] = now;

        // Capture snapshot
        snapCtx.clearRect(0, 0, snapCanvas.width, snapCanvas.height);
        snapCtx.drawImage(img, 0, 0, snapCanvas.width, snapCanvas.height);
        const snapshot = snapCanvas.toDataURL("image/png");

        socket.emit("high_confidence_pose", {
          keypoints: data.keypoints,
          pose: highest.label,
          confidence: highest.value,
          snapshot,
        });

        // Email alert cooldown
        const lastEmailTime = emailSentRef.current[highest.label] || 0;
        if (now - lastEmailTime > 5000) {
          emailSentRef.current[highest.label] = now;

          const PAYLOAD = {
            pose: highest.label,
            confidence: (highest.value * 100).toFixed(1),
            from_name: "CCTV System",
            to_email: toEmail,
            cc: cc,
            bcc: bcc,
          };

          emailjs.send(SERVICE_ID, TEMPLATE_ID, PAYLOAD, PUBLIC_KEY)
            .then(() => console.log(`Alert email sent for ${highest.label}`))
            .catch((err) => console.error("Email send failed:", err));
        }
      }
    });

    init();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (detector?.dispose) detector.dispose();
      socket.disconnect();
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
      />

      <canvas ref={canvasRef} className={styles.canvas} />

      <h2 className={styles.poseLabel}>Pose: {pose}</h2>
    </div>
  );
}

function drawSkeleton(ctx, keypoints) {
  const adjacentPairs = [
    [5, 7], [7, 9],
    [6, 8], [8, 10],
    [5, 6],
    [5, 11], [6, 12],
    [11, 12],
    [11, 13], [13, 15],
    [12, 14], [14, 16],
  ];

  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;

  keypoints.forEach((kp) => {
    if (kp.score > 0.3) {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  adjacentPairs.forEach(([i, j]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];
    if (kp1.score > 0.3 && kp2.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  });
}