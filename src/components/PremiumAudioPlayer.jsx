import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Bookmark,
  SkipBack,
  SkipForward,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  addMarkerToStorage,
  deleteMarkerFromStorage,
  loadMarkers,
  updateMarkerInStorage,
} from "../../lib/markers";

function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function PremiumAudioPlayer({
  audioId = "aqsa-audio-1",
  title = "Pendahuluan",
  subtitle = "Bab 1",
  description = "Setelah menjalankan kajian mendalam selama 40 tahun (1983–2023), penulis mendapati bahawa apa yang sedang kita hadapi sebenarnya ialah sebuah projek penjajahan strategik dan bersifat peluasan kuasa oleh Barat ke atas dunia Arab.",
  speaker = "ustaz-ashrof-lukman",
  coverImage = "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop",
  audioSrc = "/audio/pendahuluan.mp3",
  episodeLabel = "1 episod",
}) {
  const audioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMarkerFlash, setIsMarkerFlash] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [markers, setMarkers] = useState([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const savedMarkers = loadMarkers(audioId);
    setMarkers(savedMarkers);
  }, [audioId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || 0);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime || 0);
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch (err) {
      console.error("Gagal play/pause:", err);
    }
  };

  const seekAudio = (value) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Number(value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const skipPrev = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.max(0, currentTime - 10);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const skipNext = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.min(duration, currentTime + 10);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const jumpToMarker = async (time) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Gagal lompat ke marker:", err);
    }
  };

  const addMarker = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = audio.currentTime || 0;

    const duplicate = markers.some((m) => Math.abs(m.time - time) < 2);
    if (duplicate) {
      setToast(`Marker sudah ada sekitar ${formatTime(time)}`);
      return;
    }

    const note = window.prompt("Tulis nota marker (optional):", "") || "";

    const newMarker = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      time,
      label: note.trim() ? note.trim() : `Marker ${markers.length + 1}`,
      createdAt: Date.now(),
    };

    const updated = addMarkerToStorage(audioId, newMarker);
    setMarkers(updated);
    setToast(`Marker ditambah pada ${formatTime(time)}`);
    setIsMarkerFlash(true);
    setTimeout(() => setIsMarkerFlash(false), 500);
  };

  const deleteMarker = (id) => {
    const confirmed = window.confirm("Padam marker ini?");
    if (!confirmed) return;

    const updated = deleteMarkerFromStorage(audioId, id);
    setMarkers(updated);
    setToast("Marker berjaya dipadam");
  };

  const editMarker = (marker) => {
    const newLabel = window.prompt("Edit nota marker:", marker.label || "");
    if (newLabel === null) return;

    const updated = updateMarkerInStorage(audioId, marker.id, {
      label: newLabel.trim() || marker.label,
    });

    setMarkers(updated);
    setToast("Marker berjaya dikemas kini");
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-md rounded-[34px] bg-[#1f1f22] p-4 text-white shadow-2xl">
      <audio
        ref={audioRef}
        src={audioSrc}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#2a2a2e] shadow-lg">
        <div className="relative h-64">
          <img
            src={coverImage}
            alt={title}
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

          <div className="absolute right-4 top-4 rounded-full bg-white/75 px-3 py-1 text-xs font-medium text-black backdrop-blur">
            {episodeLabel}
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-lg font-medium text-white/90">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-t-[28px] border-t border-white/10 bg-[#3a3a3f] p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold">{title}</h3>
              <p className="mt-1 text-sm text-white/80">
                {subtitle} • {formatTime(duration)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addMarker}
                aria-label="Tambah marker"
                className={`flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-[#2b2b2f] shadow-lg transition duration-150 active:scale-95 ${
                  isMarkerFlash ? "ring-4 ring-red-400/30" : ""
                }`}
              >
                <Bookmark
                  size={24}
                  className={isMarkerFlash ? "text-red-400" : "text-white"}
                  fill={isMarkerFlash ? "currentColor" : "none"}
                />
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-xl transition duration-150 active:scale-95"
              >
                {isPlaying ? (
                  <Pause size={26} fill="currentColor" />
                ) : (
                  <Play size={26} fill="currentColor" className="ml-1" />
                )}
              </button>
            </div>
          </div>

          <div className="mb-2">
            <div className="relative h-5">
              <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/80" />
              <div
                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-red-500"
                style={{ width: `${progressPercent}%` }}
              />

              {duration > 0 &&
                markers.map((marker) => {
                  const left = `${(marker.time / duration) * 100}%`;
                  return (
                    <button
                      key={marker.id}
                      type="button"
                      onClick={() => jumpToMarker(marker.time)}
                      title={`${marker.label} - ${formatTime(marker.time)}`}
                      className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow"
                      style={{ left }}
                    />
                  );
                })}

              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={currentTime}
                onChange={(e) => seekAudio(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />

              <div
                className="absolute top-1/2 z-20 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow"
                style={{ left: `calc(${progressPercent}% - 10px)` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-sm font-medium text-white/85">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={skipPrev}
              className="flex items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-[#2b2b2f] px-4 py-3 text-base font-semibold shadow-md transition active:scale-[0.98]"
            >
              <SkipBack size={18} />
              Prev
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              className="rounded-[20px] border border-white/15 bg-[#2b2b2f] px-4 py-3 text-base font-semibold shadow-md transition active:scale-[0.98]"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            <button
              type="button"
              onClick={skipNext}
              className="flex items-center justify-center gap-2 rounded-[20px] border border-white/15 bg-[#2b2b2f] px-4 py-3 text-base font-semibold shadow-md transition active:scale-[0.98]"
            >
              Next
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-1 pb-2 pt-5">
        <p className="text-[15px] leading-7 text-white/90">{description}</p>
        <p className="mt-4 text-sm text-white/70">Speaker: {speaker}</p>
      </div>

      <div className="mt-2 rounded-[24px] border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-bold">Marker Ulangkaji</h4>
          <span className="text-sm text-white/65">{markers.length} marker</span>
        </div>

        {markers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/65">
            Belum ada marker. Tekan butang marker semasa audio sedang berjalan.
          </div>
        ) : (
          <div className="space-y-2">
            {markers.map((marker) => (
              <div
                key={marker.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => jumpToMarker(marker.time)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate font-semibold">{marker.label}</div>
                  <div className="text-sm text-white/70">
                    {formatTime(marker.time)}
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editMarker(marker)}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
                    aria-label="Edit marker"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteMarker(marker.id)}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
                    aria-label="Padam marker"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-100">
          {toast}
        </div>
      )}
    </div>
  );
}

export default PremiumAudioPlayer;