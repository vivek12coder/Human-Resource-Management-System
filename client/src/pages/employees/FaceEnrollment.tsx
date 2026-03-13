import { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../../components/ui';
import api from '../../lib/api';
import { useFaceApi } from '../../hooks/useFaceApi';
import { useAuthStore } from '../../store/authStore';

const SAMPLES_REQUIRED = 3;

const FaceEnrollment = () => {
  const { user } = useAuthStore();
  const { isLoaded, error: modelError } = useFaceApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [descriptors, setDescriptors] = useState<Float32Array[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const startVideo = () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Webcam not supported by this browser.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Error accessing webcam:', err);
        setErrorMessage('Could not access webcam. Please ensure permissions are granted.');
      });
  };

  const stopVideo = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, [stopVideo]);

  const captureSample = async () => {
    if (!videoRef.current || !isLoaded) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.6 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        setErrorMessage('No face detected. Please ensure you are in a well-lit area.');
      } else if (detections.length > 1) {
        setErrorMessage('Multiple faces detected. Please ensure only one person is in frame.');
      } else {
        const desc = detections[0].descriptor;
        setDescriptors(prev => [...prev, desc]);
        if (descriptors.length + 1 >= SAMPLES_REQUIRED) {
          toast.success('Successfully captured enough samples.');
          stopVideo();
        } else {
          toast.success(`Captured sample ${descriptors.length + 1}/${SAMPLES_REQUIRED}. Please turn your head slightly and click again.`);
        }
      }
    } catch (err) {
      console.error('Error detecting face:', err);
      setErrorMessage('There was an error analyzing the face. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitEnrollment = async () => {
    if (!user || user.role !== "EMPLOYEE") {
      toast.error('Only employees can register their own face.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Assuming Employee model `employeeId` corresponds to `user._id` for the query, 
      // wait, the API expects the `employeeId` ObjectId from Employee collection.
      // Easiest is to let backend find by employee User ID if `/register` is self-service? 
      // Ah, the API currently takes `employeeId` from req.body (meaning the employee _id).
      // Let's modify the backend later to query by user if it's an employee self.
      // For now, let's just send the user._id and we'll fix backend to handle either Employee _id or User _id.

      // Convert Float32Array to number[]
      const numberDescriptors = descriptors.map(desc => Array.from(desc));

      await api.post('/face/register', {
        descriptors: numberDescriptors
      });

      setSuccessMessage('Face enrolled successfully!');
      toast.success('Face registered successfully!');
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to enroll face.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetEnrollment = () => {
    setDescriptors([]);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-teal-500 mb-4" />
        <p className="text-slate-500 font-medium">Loading Facial Recognition Models...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Face Enrollment</h1>
        <p className="text-sm text-slate-500 mt-1">
          Register your face to enable face-based attendance check-in.
        </p>
      </div>

      <Card className="p-6">
        {successMessage ? (
          <div className="flex flex-col items-center py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{successMessage}</h3>
            <p className="text-slate-500">You can now use face recognition for attendance.</p>
            <Button onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            <div className="w-full max-w-sm aspect-video bg-slate-900 rounded-xl overflow-hidden relative shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onPlay={() => setIsPlaying(true)}
                className="w-full h-full object-cover"
              />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400 gap-3">
                  <Camera className="w-10 h-10" />
                  <span>Webcam is off</span>
                </div>
              )}
            </div>

            <div className="w-full max-w-sm">
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="text-slate-600 dark:text-slate-300">Samples Captured</span>
                <span className="text-teal-600 dark:text-teal-400">{descriptors.length} / {SAMPLES_REQUIRED}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 transition-all duration-300" 
                  style={{ width: `${(descriptors.length / SAMPLES_REQUIRED) * 100}%` }}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 text-danger bg-danger/10 p-4 rounded-lg text-sm w-full max-w-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            {modelError && (
              <div className="text-danger flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <p>{modelError}</p>
              </div>
            )}

            <div className="flex gap-4">
              {!isPlaying && descriptors.length < SAMPLES_REQUIRED ? (
                <Button onClick={startVideo} leftIcon={<Camera className="w-4 h-4" />}>
                  Start Camera
                </Button>
              ) : descriptors.length < SAMPLES_REQUIRED ? (
                <Button 
                  onClick={captureSample} 
                  isLoading={isProcessing}
                  disabled={!isPlaying}
                >
                  Capture Sample
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetEnrollment} disabled={isSubmitting}>
                    Retake
                  </Button>
                  <Button onClick={submitEnrollment} isLoading={isSubmitting} variant="primary">
                    Use These Samples
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FaceEnrollment;
