import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Upload, SwitchCamera, AlertCircle } from 'lucide-react';
import { api, getCurrentGpsPosition } from '../services/api';

interface Props {
  tripId: string;
  stopId?: string;
  defaultPhotoType?: string;
  onSuccess: (photo: any) => void;
  onClose: () => void;
}

export const CameraModal: React.FC<Props> = ({
  tripId,
  stopId,
  defaultPhotoType = 'Delivery Proof',
  onSuccess,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [photoType, setPhotoType] = useState(defaultPhotoType);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      setStream(null);
    }
  };

  const startCamera = async (currentFacing: 'environment' | 'user') => {
    stopCamera();
    setIsInitializing(true);
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Direct browser camera is not supported in this browser. Please use the button below to take or pick a photo.');
      setIsInitializing(false);
      return;
    }

    let mediaStream: MediaStream | null = null;

    // Cascade 1: Requested facing mode with ideal resolution
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: currentFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    } catch (err1) {
      // Cascade 2: Fallback to basic facingMode without resolution constraints
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: currentFacing },
          audio: false
        });
      } catch (err2) {
        // Cascade 3: Fallback to ANY video device (desktop webcam, USB camera)
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (err3: any) {
          console.warn('Camera initialization error:', err3);
          if (err3.name === 'NotAllowedError' || err3.name === 'PermissionDeniedError') {
            setCameraError('Camera access was denied in browser permissions. You can still take or select a photo using the button below.');
          } else {
            setCameraError('Hardware camera unavailable. Please use the device photo selector below.');
          }
          setIsInitializing(false);
          return;
        }
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }
    }
    setIsInitializing(false);
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Use actual stream dimensions or sensible default
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // If front camera, unmirror if needed
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedBlob(blob);
            setPreviewUrl(URL.createObjectURL(blob));
            stopCamera();
          }
        },
        'image/jpeg',
        0.88
      );
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
      stopCamera();
    }
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedBlob(null);
    setPreviewUrl(null);
    startCamera(facingMode);
  };

  const uploadPhoto = async () => {
    if (!capturedBlob) return;
    setUploading(true);

    try {
      const coords = await getCurrentGpsPosition();
      const formData = new FormData();
      formData.append('photo', capturedBlob, `proof_${Date.now()}.jpg`);
      formData.append('trip_id', tripId);
      if (stopId) formData.append('stop_id', stopId);
      formData.append('photo_type', photoType);
      if (coords.latitude) formData.append('latitude', coords.latitude.toString());
      if (coords.longitude) formData.append('longitude', coords.longitude.toString());
      if (coords.gps_accuracy) formData.append('gps_accuracy', coords.gps_accuracy.toString());

      const res = await api.photos.upload(formData);
      onSuccess(res.photo);
      onClose();
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Network error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(37, 211, 102, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-whatsapp)'
              }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Photo Evidence Capture</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                High-resolution proof with automatic GPS timestamp stamping
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '6px', borderRadius: 'var(--radius-full)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Proof Category
            </label>
            <select
              className="form-select"
              value={photoType}
              onChange={(e) => setPhotoType(e.target.value)}
            >
              <option value="Delivery Proof">Delivery Proof (Signed invoice / Goods received)</option>
              <option value="Pickup Proof">Pickup Proof (Warehouse loading dock)</option>
              <option value="Delay Proof">Delay Proof (Traffic congestion / Road bottleneck)</option>
              <option value="Damage">Damage or Cargo Discrepancy</option>
              <option value="Vehicle Issue">Vehicle Mechanical / Tire Issue</option>
              <option value="Loading / Unloading">Loading / Unloading Verification</option>
              <option value="Other">Other Operational Proof</option>
            </select>
          </div>

          {/* Viewfinder or Captured Preview */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '300px',
              backgroundColor: '#000',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-medium)'
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Captured Proof"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : stream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Viewfinder Target Framing Guidelines */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '24px',
                    border: '1.5px dashed rgba(255, 255, 255, 0.45)',
                    borderRadius: 'var(--radius-md)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: 'var(--accent-whatsapp)',
                      borderRadius: '50%',
                      boxShadow: '0 0 8px var(--accent-whatsapp)'
                    }}
                  />
                </div>

                {/* Flip Camera Toggle Button */}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    backdropFilter: 'blur(4px)'
                  }}
                  title="Switch Front/Rear Camera"
                >
                  <SwitchCamera size={16} />
                  <span>Flip</span>
                </button>
              </>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {isInitializing ? (
                  <>
                    <RefreshCw size={36} className="spin-icon" style={{ opacity: 0.6, margin: '0 auto 10px' }} />
                    <p style={{ fontSize: '0.85rem' }}>Initializing camera hardware...</p>
                  </>
                ) : (
                  <>
                    <AlertCircle size={36} color="var(--status-delayed)" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontSize: '0.82rem', maxWidth: '300px', margin: '0 auto' }}>
                      {cameraError || 'Camera unavailable'}
                    </p>
                  </>
                )}
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Native Camera / Device File Trigger */}
          {!previewUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  fontSize: '0.84rem'
                }}
              >
                <Upload size={16} />
                <span>Choose from Gallery / Native Phone Camera</span>
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          {previewUrl ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={retake}
                disabled={uploading}
              >
                <RefreshCw size={15} /> Retake
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={uploadPhoto}
                disabled={uploading}
                style={{
                  backgroundColor: 'var(--accent-whatsapp)',
                  borderColor: 'var(--accent-whatsapp)',
                  color: '#0b141a',
                  fontWeight: 600
                }}
              >
                {uploading ? (
                  'Saving...'
                ) : (
                  <>
                    <Check size={18} /> Confirm & Attach Proof
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-large"
              style={{
                width: '100%',
                backgroundColor: stream ? 'var(--accent-whatsapp)' : undefined,
                borderColor: stream ? 'var(--accent-whatsapp)' : undefined,
                color: stream ? '#0b141a' : undefined,
                fontWeight: 600
              }}
              onClick={takeSnapshot}
              disabled={!stream}
            >
              <Camera size={18} /> Take Snapshot
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
