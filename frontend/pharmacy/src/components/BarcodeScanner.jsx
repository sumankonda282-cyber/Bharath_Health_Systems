import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Camera, CameraOff, Keyboard, X, ScanLine } from 'lucide-react'

/**
 * BarcodeScanner — camera + USB/keyboard barcode input
 * Props:
 *   onScan(barcode: string) — called when a barcode is detected
 *   onClose() — called when user dismisses
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const [mode, setMode]         = useState('camera') // 'camera' | 'manual'
  const [manualInput, setManualInput] = useState('')
  const [error, setError]       = useState('')
  const [scanning, setScanning] = useState(false)
  const videoRef  = useRef(null)
  const readerRef = useRef(null)
  const manualRef = useRef(null)

  // Camera scanning
  useEffect(() => {
    if (mode !== 'camera') return
    let mounted = true

    const startScan = async () => {
      setError('')
      setScanning(true)
      try {
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        if (!devices.length) {
          setError('No camera found. Use manual entry below.')
          setMode('manual')
          return
        }
        // Prefer back camera on mobile
        const device = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1]
        await reader.decodeFromVideoDevice(device.deviceId, videoRef.current, (result, err) => {
          if (!mounted) return
          if (result) {
            const code = result.getText()
            stopScan()
            onScan(code)
          }
        })
      } catch (e) {
        if (mounted) {
          setError('Camera access denied. Use manual entry.')
          setMode('manual')
        }
      } finally {
        if (mounted) setScanning(false)
      }
    }

    startScan()
    return () => {
      mounted = false
      stopScan()
    }
  }, [mode])

  const stopScan = () => {
    try { readerRef.current?.reset() } catch {}
  }

  // USB scanner (types barcode as keyboard input ending with Enter)
  useEffect(() => {
    if (mode !== 'manual') return
    manualRef.current?.focus()
  }, [mode])

  const submitManual = () => {
    const code = manualInput.trim()
    if (!code) return
    setManualInput('')
    onScan(code)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <ScanLine size={18} className="text-blue-600" />
            Scan Barcode
          </div>
          <button onClick={() => { stopScan(); onClose() }} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === 'camera' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            <Camera size={15} /> Camera
          </button>
          <button
            onClick={() => { stopScan(); setMode('manual') }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${mode === 'manual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            <Keyboard size={15} /> Manual / USB
          </button>
        </div>

        {/* Camera view */}
        {mode === 'camera' && (
          <div className="relative bg-black">
            <video ref={videoRef} className="w-full h-64 object-cover" autoPlay muted playsInline />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-32 border-2 border-blue-400 rounded-lg relative">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br" />
                {/* Scan line animation */}
                <div className="absolute left-1 right-1 h-0.5 bg-blue-400 opacity-80 animate-bounce" style={{ top: '45%' }} />
              </div>
            </div>
            {error && (
              <div className="absolute bottom-2 left-2 right-2 bg-red-600 text-white text-xs text-center py-1.5 rounded-lg">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Manual / USB input */}
        {mode === 'manual' && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500 text-center">
              Type barcode number or use a USB scanner — it will auto-submit on Enter
            </p>
            <input
              ref={manualRef}
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitManual()}
              placeholder="Scan or type barcode…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest"
              autoFocus
            />
            <button
              onClick={submitManual}
              disabled={!manualInput.trim()}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              Look Up
            </button>
          </div>
        )}

        <div className="px-4 pb-4 pt-2 text-center text-xs text-gray-400">
          Hold barcode steady in the frame · Supports EAN-13, Code 128, QR
        </div>
      </div>
    </div>
  )
}
