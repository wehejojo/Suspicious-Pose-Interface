import React, { useRef, useEffect, useState } from "react";
import * as posedetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import { io } from "socket.io-client";
import styles from "./CameraPosePredictor.module.css";

export default function CameraPosePredictor() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const snapshotCanvasRef = useRef(null); // Reusable offscreen canvas
  const [pose, setPose] = useState("neutral");

  const lastSnapshotTime = {};
  const SNAPSHOT_COOLDOWN = 5000;

  useEffect(() => {
    const socket = io("http://localhost:5000");
    let detector;
    let animationFrameId;
    let lastEstimateTime = 0;

    async function init() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext("2d");

      snapshotCanvasRef.current = document.createElement("canvas");
      const snapCanvas = snapshotCanvasRef.current;
      const snapCtx = snapCanvas.getContext("2d");

      video.width = 640;
      video.height = 480;
      canvas.width = 640;
      canvas.height = 480;
      snapCanvas.width = 640;
      snapCanvas.height = 480;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
        await video.play();
      } catch (err) {
        console.warn("Camera error:", err);
      }

      await tf.setBackend("webgl");
      await tf.ready();

      detector = await posedetection.createDetector(
        posedetection.SupportedModels.MoveNet,
        { modelType: "SinglePose.Lightning" }
      );

      socket.on("pose", (data) => {
        if (data.confidences) {
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

            // Reuse offscreen canvas
            snapCtx.clearRect(0, 0, snapCanvas.width, snapCanvas.height);
            snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
            const snapshot = snapCanvas.toDataURL("image/png");

            socket.emit("high_confidence_pose", {
              keypoints: data.keypoints,
              pose: highest.label,
              confidence: highest.value,
              snapshot,
            });
          }
        }
      });

      async function loop() {
        const now = performance.now();
        if (now - lastEstimateTime > 100) {
          const poses = await detector.estimatePoses(video);
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (poses.length > 0) {
            const keypoints = poses[0].keypoints;
            drawSkeleton(ctx, keypoints);
            socket.emit("keypoints", { keypoints: keypoints.map((k) => [k.x, k.y]) });
          }
          lastEstimateTime = now;
        }

        animationFrameId = requestAnimationFrame(loop);
      }

      loop();
    }

    init();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
      if (detector) detector.dispose?.();
      socket.disconnect();
    };
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Real-Time Pose Detection</h1>
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        muted
        playsInline
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
