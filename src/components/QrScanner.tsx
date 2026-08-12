import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Minimal typing for the Barcode Detection API, which TypeScript's DOM library
 * does not yet describe.
 */
interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

function getBarcodeDetector(): BarcodeDetectorConstructor | undefined {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
}

type ScannerState = 'starting' | 'scanning' | 'error';

interface QrScannerProps {
  /** Called with the raw text of the first code detected. */
  onDetected: (rawValue: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onDetected, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  // Guards against firing onDetected repeatedly while the loop unwinds.
  const handledRef = useRef(false);

  const [state, setState] = useState<ScannerState>('starting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const start = async () => {
      const Detector = getBarcodeDetector();

      if (!Detector) {
        setState('error');
        setErrorMessage(
          'This browser cannot scan QR codes in-app. Use your phone’s own camera app on the label instead — it opens the device record directly — or enter the Device ID below.'
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setState('error');
        setErrorMessage('No camera is available in this browser. Enter the Device ID below instead.');
        return;
      }

      try {
        // The rear camera is the useful one for reading a label on a machine.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();

        if (cancelled) return;
        setState('scanning');

        const detector = new Detector({ formats: ['qr_code'] });

        const tick = async () => {
          if (cancelled || handledRef.current) return;

          const el = videoRef.current;
          if (el && el.readyState === el.HAVE_ENOUGH_DATA) {
            try {
              const codes = await detector.detect(el);
              if (codes.length > 0 && codes[0].rawValue && !handledRef.current) {
                handledRef.current = true;
                stop();
                onDetected(codes[0].rawValue);
                return;
              }
            } catch {
              // A single failed frame is not fatal; keep scanning.
            }
          }

          rafRef.current = requestAnimationFrame(() => {
            void tick();
          });
        };

        void tick();
      } catch (err: any) {
        if (cancelled) return;
        setState('error');

        if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
          setErrorMessage(
            'Camera access was blocked. Allow camera permission for this site in your browser settings, then try again — or enter the Device ID below.'
          );
        } else if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
          setErrorMessage('No camera was found on this device. Enter the Device ID below instead.');
        } else {
          setErrorMessage(`The camera could not be started: ${err?.message || err}`);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [onDetected]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400 font-bold flex items-center gap-2">
          <Camera className="w-3.5 h-3.5" />
          Scan device label
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
          aria-label="Close scanner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {state === 'error' ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200 flex items-start gap-2.5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-[4/3] max-w-sm">
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />

          {/* Framing guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border-2 border-teal-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
          </div>

          {state === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-[11px] font-mono text-slate-300 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              Starting camera&hellip;
            </div>
          )}
        </div>
      )}

      {state === 'scanning' && (
        <p className="text-[10.5px] font-mono text-slate-500 leading-relaxed">
          Hold the QR label inside the frame. The device history opens automatically.
        </p>
      )}
    </div>
  );
}
