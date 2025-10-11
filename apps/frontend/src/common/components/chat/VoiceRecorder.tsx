"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/common/components/ui/button";
import { Mic, Send, X, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export default function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  isUploading = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(true); // Start as recording
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStartedRef = useRef(false);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setHasRecorded(true);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Send recording
  const sendRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, recordingTime);
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onCancel();
  };

  // Auto-start recording on mount
  useEffect(() => {
    if (!hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startRecording();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
      {/* Recording Animation */}
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full ${
                isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"
              }`}
              style={{
                height: isRecording ? `${12 + Math.random() * 20}px` : "20px",
                animationDelay: `${i * 0.1}s`,
                animationDuration: "0.6s",
              }}
            />
          ))}
        </div>
        <span
          className={`text-sm font-medium ${
            isRecording ? "text-red-500" : "text-green-500"
          }`}
        >
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Cancel Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0"
        onClick={cancelRecording}
        disabled={isUploading}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Record/Stop/Send Button */}
      {isRecording ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="bg-red-500 hover:bg-red-600"
          onClick={stopRecording}
        >
          <Mic className="h-4 w-4 mr-2" />
          Stop
        </Button>
      ) : (
        <Button
          type="button"
          variant="default"
          size="sm"
          className="bg-green-500 hover:bg-green-600"
          onClick={sendRecording}
          disabled={isUploading || !audioBlob}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send
            </>
          )}
        </Button>
      )}
    </div>
  );
}

