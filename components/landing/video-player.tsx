"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlayOnView?: boolean;
  showControls?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export function VideoPlayer({
  src,
  poster,
  className = "",
  autoPlayOnView = true,
  showControls = true,
  loop = true,
  muted: initialMuted = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [progress, setProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);

  // Auto-play on scroll into view
  useEffect(() => {
    if (!autoPlayOnView || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
            setIsPlaying(true);
            setShowOverlay(false);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current!);
    return () => observer.disconnect();
  }, [autoPlayOnView]);

  // Update progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / video.duration) * 100);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
      setShowOverlay(false);
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * videoRef.current.duration;
  };

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden rounded-xl border border-border bg-card ${className}`}
      onMouseEnter={() => showControls && setShowOverlay(true)}
      onMouseLeave={() => showControls && isPlaying && setShowOverlay(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop={loop}
        muted={isMuted}
        playsInline
        className="h-full w-full object-cover"
        onClick={togglePlay}
      />

      {/* Play button overlay */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: showOverlay ? 1 : 0 }}
        className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm transition-opacity"
      >
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
            aria-label="Play video"
          >
            <Play className="ml-1 h-6 w-6" />
          </button>
        )}
      </motion.div>

      {/* Controls bar */}
      {showControls && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showOverlay ? 1 : 0, y: showOverlay ? 0 : 10 }}
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-4"
        >
          {/* Progress bar */}
          <div
            className="mb-3 h-1 cursor-pointer overflow-hidden rounded-full bg-secondary"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/80 text-foreground transition-colors hover:bg-secondary"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4" />
                )}
              </button>
              <button
                onClick={toggleMute}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/80 text-foreground transition-colors hover:bg-secondary"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              onClick={handleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/80 text-foreground transition-colors hover:bg-secondary"
              aria-label="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Simple looping demo video component (no controls, auto-plays)
interface DemoLoopProps {
  src: string;
  poster?: string;
  className?: string;
}

export function DemoLoop({ src, poster, className = "" }: DemoLoopProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`overflow-hidden rounded-xl ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    </div>
  );
}
