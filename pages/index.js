import { useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Load the COCO-SSD model when the component mounts
  useEffect(() => {
    tf.ready().then(() => {
      console.log('TensorFlow.js is ready.');
    });
  }, []);

  const handleFileUpload = (e) => {
    if (e.target.files[0]) {
      setVideoFile(URL.createObjectURL(e.target.files[0]));
      setSpeed(null); // Reset speed when a new video is uploaded
    }
  };

  const processVideo = async () => {
    setProcessing(true);
    const model = await cocoSsd.load();
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Ensure the video is loaded
    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const frameRate = 1; // Analyze 1 frame per second
      let currentTime = 0;
      let previousBBox = null;
      let previousTime = 0;
      let totalDistance = 0;

      while (currentTime < duration) {
        video.currentTime = currentTime;
        await new Promise((resolve) => {
          video.onseeked = async () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const predictions = await model.detect(canvas);
            const vehicle = predictions.find(
              (pred) =>
                pred.class === 'car' ||
                pred.class === 'truck' ||
                pred.class === 'bus' ||
                pred.class === 'motorcycle'
            );

            if (vehicle && previousBBox) {
              const dx = vehicle.bbox[0] - previousBBox[0];
              const dy = vehicle.bbox[1] - previousBBox[1];
              const pixelDistance = Math.sqrt(dx * dx + dy * dy);

              // Convert pixel distance to real-world distance
              // You need to set this scale based on calibration
              const scale = 0.05; // Example: 0.05 meters per pixel
              const realDistance = pixelDistance * scale;
              const timeElapsed = currentTime - previousTime;
              const speedMps = realDistance / timeElapsed;
              const speedKmph = speedMps * 3.6;

              setSpeed(`Estimated Speed: ${speedKmph.toFixed(2)} km/h`);

              totalDistance += realDistance;
            }

            if (vehicle) {
              previousBBox = vehicle.bbox;
              previousTime = currentTime;
            }

            resolve();
          };
        });
        currentTime += frameRate;
      }
      setProcessing(false);
    };
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Vehicle Speed Estimator</h1>
      <input type="file" accept="video/*" onChange={handleFileUpload} />
      {videoFile && (
        <div>
          <video
            ref={videoRef}
            src={videoFile}
            width="600"
            height="400"
            controls
            style={{ marginTop: '20px' }}
          ></video>
          <canvas
            ref={canvasRef}
            width="600"
            height="400"
            style={{ display: 'none' }}
          ></canvas>
          <div>
            <button
              onClick={processVideo}
              disabled={processing}
              style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}
            >
              {processing ? 'Processing...' : 'Estimate Speed'}
            </button>
          </div>
        </div>
      )}
      {speed && <h2>{speed}</h2>}
    </div>
  );
    }
