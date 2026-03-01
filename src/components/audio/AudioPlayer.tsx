import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Heart,
  Share2,
  Download,
  ListMusic,
  X
} from 'lucide-react';

export default function AudioPlayer() {
  const { 
    currentSong, 
    isPlaying, 
    currentTime,
    pauseSong, 
    resumeSong, 
    seekTo,
    setCurrentTime,
    likeSong,
    songs,
    playSong,
  } = useStore();
  
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  
  // Simulate audio playback with interval
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    if (isPlaying && currentSong) {
      intervalId = setInterval(() => {
        setCurrentTime(Math.min(currentTime + 1, currentSong.duration));
      }, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, currentTime, currentSong, setCurrentTime]);
  
  // Reset time when song changes
  useEffect(() => {
    if (currentSong) {
      setCurrentTime(0);
    }
  }, [currentSong?.id]);
  
  if (!currentSong) return null;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const progress = (currentTime / currentSong.duration) * 100;
  
  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * currentSong.duration;
    seekTo(newTime);
  };
  
  const handlePlayPause = () => {
    if (isPlaying) {
      pauseSong();
    } else {
      resumeSong();
    }
  };
  
  const handlePrevious = () => {
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
    playSong(songs[previousIndex]);
  };
  
  const handleNext = () => {
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const nextIndex = currentIndex < songs.length - 1 ? currentIndex + 1 : 0;
    playSong(songs[nextIndex]);
  };
  
  const handleLike = () => {
    likeSong(currentSong.id);
  };
  
  const handleShare = () => {
    const url = `${window.location.origin}/song/${currentSong.id}`;
    navigator.clipboard.writeText(url);
    // Could show toast here
  };
  
  const handleDownload = () => {
    // In a real app, this would download the actual audio file
    const link = document.createElement('a');
    link.href = currentSong.audioUrl;
    link.download = `${currentSong.title}.mp3`;
    link.click();
  };
  
  return (
    <>
      {/* Main Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/10">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 cursor-pointer group">
          <div 
            className="h-full gradient-coral relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Song Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img 
                src={currentSong.image} 
                alt={currentSong.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h4 className="text-white font-medium text-sm truncate">{currentSong.title}</h4>
                <p className="text-white/50 text-xs truncate">{currentSong.artist}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLike}
                className={`${currentSong.isLiked ? 'text-[#ff6b6b]' : 'text-white/50'} hover:text-[#ff6b6b]`}
              >
                <Heart className="w-4 h-4" fill={currentSong.isLiked ? 'currentColor' : 'none'} />
              </Button>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              
              <Button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-full gradient-coral text-black hover:opacity-90 flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Time & Actions */}
            <div className="flex items-center gap-4 flex-1 justify-end">
              <span className="text-white/50 text-xs hidden sm:inline">
                {formatTime(currentTime)} / {formatTime(currentSong.duration)}
              </span>
              
              {/* Volume */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={(v) => setVolume(v[0] / 100)}
                  max={100}
                  step={1}
                  className="w-20"
                />
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="text-white/50 hover:text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className={`text-white/50 hover:text-white hover:bg-white/10 ${showPlaylist ? 'text-[#ff6b6b]' : ''}`}
                >
                  <ListMusic className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Playlist Panel */}
      {showPlaylist && (
        <div className="fixed bottom-20 right-4 z-50 w-80 max-h-96 overflow-auto glass rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Queue</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPlaylist(false)}
              className="text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {songs.map((song) => (
              <div
                key={song.id}
                onClick={() => playSong(song)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  song.id === currentSong.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <img src={song.image} alt={song.title} className="w-10 h-10 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${song.id === currentSong.id ? 'text-[#ff6b6b]' : 'text-white'}`}>
                    {song.title}
                  </p>
                  <p className="text-white/50 text-xs truncate">{song.artist}</p>
                </div>
                {song.id === currentSong.id && isPlaying && (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-4 bg-[#ff6b6b] animate-pulse" />
                    <div className="w-1 h-4 bg-[#ff6b6b] animate-pulse" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1 h-4 bg-[#ff6b6b] animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
