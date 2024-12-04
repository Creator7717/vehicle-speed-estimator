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
              pred.class === 'bus'
          );

          if (vehicle && previousBBox) {
            const dx = vehicle.bbox[0] - previousBBox[0];
            const dy = vehicle.bbox[1] - previousBBox[1];
            const pixelDistance = Math.sqrt(dx * dx + dy * dy);

            // Convert pixel distance to real-world distance
            // Assume scale (e.g., 1 pixel = 0.05 meters)
            const scale = 0.05;
            const realDistance = pixelDistance * scale;
            const timeElapsed = currentTime - previousTime;
            const speedMps = realDistance / timeElapsed;
            totalDistance += realDistance;
            setSpeed(
              `Estimated Speed: ${(speedMps * 3.6).toFixed(2)} km/h`
            );
          }

          previousBBox = vehicle ? vehicle.bbox : null;
          previousTime = currentTime;
          resolve();
        };
      });
      currentTime += frameRate;
    }
    setProcessing(false);
  };
};
