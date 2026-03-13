import { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

export const useFaceApi = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load face-api models', err);
        setError('Failed to load face recognition models.');
      }
    };
    loadModels();
  }, []);

  return { isLoaded, error };
};
