import { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui';
import api from '../../lib/api';
import { useFaceApi } from '../../hooks/useFaceApi';

const RECOGNITION_THRESHOLD = 0.55;

export const FaceAttendance = () => {
  const { isLoaded, error: modelError } = useFaceApi();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [statusText, setStatusText] = useState('Initializing camera...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState<any>(null);

  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  
  // Throttle interval
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all face embeddings from the backend
  const loadDescriptors = async () => {
    setIsInitializing(true);
    setStatusText('Loading face data...');
    try {
      const res = await api.get('/face/descriptors');
      const data = res.data.data;

      if (!data || data.length === 0) {
        setStatusText('No enrolled faces found.');
        return;
      }

      // Convert arrays back to Float32Arrays and create LabeledFaceDescriptors
      const labeledDescriptors = data.map((emp: any) => {
        const float32Arrays = emp.descriptors.map(
          (descArray: number[]) => new Float32Array(descArray)
        );
        return new faceapi.LabeledFaceDescriptors(emp.employeeId, float32Arrays);
      });

      const matcher = new faceapi.FaceMatcher(labeledDescriptors, RECOGNITION_THRESHOLD);
      setFaceMatcher(matcher);
      setStatusText('Ready for Attendance');
      
      startVideo();
    } catch (err) {
      console.error('Failed to load descriptors:', err);
      setStatusText('Failed to load face data.');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      loadDescriptors();
    }
    return () => {
      stopVideo();
    };
  }, [isLoaded]);

  const startVideo = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatusText('Webcam not supported.');
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
        setStatusText('Could not access webcam. Please check permissions.');
      });
  };

  const stopVideo = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsPlaying(false);
    }
  }, []);

  const handleVideoPlay = () => {
    setIsPlaying(true);
    if (!faceMatcher) return;

    if (canvasRef.current && videoRef.current) {
      const displaySize = { width: videoRef.current.clientWidth, height: videoRef.current.clientHeight };
      faceapi.matchDimensions(canvasRef.current, displaySize);
    }

    // Set up recognition loop
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || isSuccess) return;

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      const displaySize = { width: videoRef.current.clientWidth, height: videoRef.current.clientHeight };
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      if (detections.length === 0) {
        setStatusText('Align face in frame');
        return;
      }
      
      if (detections.length > 1) {
        setStatusText('Multiple faces detected. One person allowed.');
        return;
      }

      setStatusText('Analyzing...');
      
      // We have one face
      const result = faceMatcher.findBestMatch(detections[0].descriptor);

      if (result.label !== 'unknown') {
        const employeeId = result.label;
        setStatusText(`Match found! Checking in...`);
        
        // Stop the loop directly
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        // Optionally draw box
        if (ctx) faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        
        await markAttendance(employeeId);
      } else {
        setStatusText('Face not recognized');
      }

    }, 800); // Check every 800ms
  };

  const markAttendance = async (employeeId: string) => {
    try {
      const response = await api.post('/attendance/face', { employeeId });
      
      const { type, attendance } = response.data.data;
      
      setIsSuccess(true);
      setSuccessInfo({ type, ...attendance });
      stopVideo();
      toast.success(response.data.message);
      
      setTimeout(() => {
        window.location.reload(); // reset after 5s or redirect
      }, 5000);
      
    } catch (err: any) {
      setAttendanceError(err.response?.data?.message || 'Failed to mark attendance.');
      setStatusText(err.response?.data?.message || 'Failed to mark attendance.');
      
      // Optionally resume finding another face
      setTimeout(() => {
        setAttendanceError(null);
        setStatusText('Align face in frame');
        // Restart interval
        if (isPlaying && faceMatcher) {
          handleVideoPlay();
        }
      }, 3000);
    }
  };

  if (!isLoaded || isInitializing || modelError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        {modelError ? (
          <p className="text-danger flex items-center gap-2 font-medium">{modelError}</p>
        ) : (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-teal-500 mb-4" />
            <p className="text-slate-500 font-medium">{statusText || "Loading system..."}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 mt-4">Face Attendance Kiosk</h1>
        <p className="text-slate-500">Look directly at the camera to check in or out.</p>
      </div>

      <Card className="p-8 shadow-2xl relative overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20">
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-fadeIn">
            <div className="w-24 h-24 bg-teal-100 text-teal-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Successfully {successInfo?.type === 'check-in' ? "Checked In" : "Checked Out"}!
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="mt-8 text-sm text-slate-500 animate-pulse">Screen will reset automatically...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center relative">
            
            {/* Camera View */}
            <div className="relative w-[400px] h-[400px] bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-2xl border-4 border-white/50 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onPlay={handleVideoPlay}
                width={400}
                height={400}
                className={`object-cover z-10 w-full h-full transform -scale-x-100 ${!isPlaying ? "opacity-0" : "opacity-100 transition-opacity duration-1000"}`}
              />
              <canvas 
                ref={canvasRef} 
                className="absolute inset-0 z-20 object-cover w-[400px] h-[400px] transform -scale-x-100" 
              />
              
              {!isPlaying && (
                <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Camera className="w-16 h-16" />
                  <span className="font-medium tracking-widest uppercase">Initializing...</span>
                </div>
              )}
              
              {/* Scan indicator overlay */}
              {isPlaying && (
                <div className="absolute inset-y-0 w-full z-30 pointer-events-none">
                   <div className="w-full h-1 bg-teal-400/80 shadow-[0_0_15px_rgba(45,212,191,0.5)] animate-scan" style={{boxShadow: '0 0 15px rgba(20, 184, 166, 0.8)'}} />
                </div>
              )}
            </div>

            {/* Status Information */}
            <div className="mt-8 flex flex-col items-center">
               <div className={`px-6 py-2 rounded-full font-bold uppercase tracking-wider text-sm transition-colors shadow-sm
                  ${statusText === 'Match found! Checking in...' ? 'bg-teal-100 text-teal-700 border border-teal-200' :
                    attendanceError ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                    'bg-indigo-100 text-indigo-700 border border-indigo-200'}
               `}>
                 {statusText}
               </div>
            </div>
          </div>
        )}
      </Card>
      
      {/* Required scan animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(400px); }
          100% { transform: translateY(0); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}} />
    </div>
  );
};

export default FaceAttendance;
