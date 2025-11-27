import React, { useRef, useEffect, useState } from "react";
import * as posedetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import { io } from 'socket.io-client';

const socket = io("/", { path: "/socket.io" });

export default function CameraPosePredictor() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detector, setDetector] = useState(null);
  const [prediction, setPrediction] = useState("Detecting...");
  const frameCountRef = useRef(0);

  const setupCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = () => resolve();
        });
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
    }
  };

  const loadModel = async () => {
    await tf.setBackend("webgl");
    await tf.ready();
    const detector = await posedetection.createDetector(
      posedetection.SupportedModels.MoveNet,
      { modelType: "SinglePose.Lightning" }
    );
    setDetector(detector);
  };

  useEffect(() => {
    const init = async () => {
      await setupCamera();
      await loadModel();
    };
    init();
  }, []);

  const drawSkeleton = (keypoints, ctx) => {
    const adjacentPairs = posedetection.util.getAdjacentPairs(
      posedetection.SupportedModels.MoveNet
    );
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "red";
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    keypoints.forEach(kp => {
      if (kp.score > 0.3) {
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
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
  };

  const detectFrame = async () => {
    frameCountRef.current += 1;
    const runInference = frameCountRef.current % 8 === 0;
    if (!detector || !videoRef.current) {
      requestAnimationFrame(detectFrame);
      return;
    }

    try {
      const poses = await detector.estimatePoses(videoRef.current);
      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          drawSkeleton(keypoints, ctx);
        }

        if (runInference) {
          const features = keypoints.flatMap(p => [p.x, p.y, p.score]);
          fetch("/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              features,
              timestamp: new Date().toISOString()
            })
          })
            .then(res => res.json())
            .then(data => {
              if (data.prediction) setPrediction(data.prediction);
              console.log(data);
            })
            .catch(() => {});
        }
      } else if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    } catch (error) {
      console.error("Pose estimation error:", error);
    }

    requestAnimationFrame(detectFrame);
  };

  useEffect(() => {
    if (detector) detectFrame();
  }, [detector]);

  return (
    <div style={{ textAlign: "center", position: "relative", display: "inline-block" }}>
      <h1>Real-Time Pose Detection</h1>
      <video
        ref={videoRef}
        width={640}
        height={480}
        style={{ borderRadius: "10px", border: "2px solid #555" }}
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ 
          position: "absolute",
          top: 0,
          left: 0,
          borderRadius: "10px",
          pointerEvents: "none"
        }}
      />
      <h2 style={{ marginTop: "20px" }}>Pose: {prediction}</h2>
    </div>
  );
}
