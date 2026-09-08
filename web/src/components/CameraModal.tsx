import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Upload } from 'lucide-react';
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoType, setPhotoType] = useState(defaultPhotoType);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } else {
        setCameraError('Direct camera stream not supported. You can select or take a photo with the file picker below.');
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. You can upload/take a picture via file picker.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedBlob(blob);
            setPreviewUrl(URL.createObjectURL(blob));
            stopCamera();
          }
        },
        'image/jpeg',
        0.85
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
    startCamera();
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
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '1.1rem' }}>Photo Proof Capture</h3>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Proof Category</label>
            <select
              className="form-select"
              value={photoType}
              onChange={(e) => setPhotoType(e.target.value)}
            >
              <option value="Delivery Proof">Delivery Proof (Signed note / Goods delivered)</option>
              <option value="Pickup Proof">Pickup Proof</option>
              <option value="Delay Proof">Delay Proof (Traffic / Breakdown / Block)</option>
              <option value="Damage">Damage or Discrepancy</option>
              <option value="Vehicle Issue">Vehicle Issue</option>
              <option value="Loading / Unloading">Loading / Unloading</option>
              <option value="Other">Other Operational Proof</option>
            </select>
          </div>

          {/* Camera Viewfinder or Captured Preview */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '280px',
              backgroundColor: '#000',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Camera size={40} style={{ opacity: 0.5, marginBottom: '8px' }} />
                <p style={{ fontSize: '0.85rem' }}>{cameraError || 'Initializing camera...'}</p>
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Fallback File Picker */}
          {!previewUrl && (
            <label
              className="btn btn-secondary"
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
            >
              <Upload size={16} /> Choose Existing Photo / Device Camera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        <div className="modal-footer">
          {previewUrl ? (
            <>
              <button className="btn btn-secondary" onClick={retake} disabled={uploading}>
                <RefreshCw size={16} /> Retake
              </button>
              <button className="btn btn-primary" onClick={uploadPhoto} disabled={uploading}>
                {uploading ? (
                  'Uploading...'
                ) : (
                  <>
                    <Check size={18} /> Confirm & Save Photo
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary btn-large"
              style={{ width: '100%' }}
              onClick={takeSnapshot}
              disabled={!stream}
            >
              <Camera size={20} /> Capture Snapshot
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
