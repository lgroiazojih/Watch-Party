import { useState, useEffect, useRef, useCallback } from 'react';

export default function VideoPlayer({ videoUrl, isCreator, socket, roomId }) {
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const lastSeekTimeRef = useRef(0);
  const seekDebounceRef = useRef(null);
  const lastStateRef = useRef(null);

  useEffect(() => {
    if (!videoUrl) return;

    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        createPlayer();
        return;
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    };

    loadYouTubeAPI();
  }, [videoUrl]);

  // Handle incoming video actions from other users
  useEffect(() => {
    if (!socket) return;

    const handleVideoAction = (data) => {
      if (!player) return;
      // Only non-creators should respond to remote actions
      if (isCreator) return;
      
      isUpdatingRef.current = true;
      
      if (data.action === 'play') {
        player.seekTo(data.time, true);
        player.playVideo();
        setIsPlaying(true);
      } else if (data.action === 'pause') {
        player.seekTo(data.time, true);
        player.pauseVideo();
        setIsPlaying(false);
      } else if (data.action === 'seek') {
        player.seekTo(data.time, true);
        setCurrentTime(data.time);
      }
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 300);
    };

    const handleVideoState = (data) => {
      if (!player) return;
      if (isCreator) return;
      
      isUpdatingRef.current = true;
      
      player.seekTo(data.time, true);
      if (data.action === 'play') {
        player.playVideo();
        setIsPlaying(true);
      } else if (data.action === 'pause') {
        player.pauseVideo();
        setIsPlaying(false);
      }
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 300);
    };

    socket.on('video-action', handleVideoAction);
    socket.on('video-state', handleVideoState);

    return () => {
      socket.off('video-action', handleVideoAction);
      socket.off('video-state', handleVideoState);
    };
  }, [socket, player, isCreator]);

  const emitAction = useCallback((action, time) => {
    if (socket && isCreator) {
      socket.emit('video-action', {
        roomId,
        action,
        time
      });
    }
  }, [socket, isCreator, roomId]);

  const createPlayer = () => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return;

    if (player) {
      player.destroy();
    }

    const newPlayer = new window.YT.Player('youtube-player', {
      videoId: videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        disablekb: false,
      },
      events: {
        onReady: (event) => {
          setPlayer(newPlayer);
          setDuration(event.target.getDuration());
        },
        onStateChange: (event) => {
          // Skip if we're updating from remote
          if (isUpdatingRef.current) return;
          
          const time = event.target.getCurrentTime();
          const state = event.data;
          
          setCurrentTime(time);
          
          // Detect seek: if time jumped significantly
          const timeDiff = Math.abs(time - lastSeekTimeRef.current);
          const isSeek = timeDiff > 2 && lastStateRef.current === state;
          
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            if (isCreator && socket) {
              if (isSeek) {
                // User seeked using YouTube's built-in progress bar
                socket.emit('video-action', {
                  roomId,
                  action: 'seek',
                  time
                });
              } else {
                socket.emit('video-action', {
                  roomId,
                  action: 'play',
                  time
                });
              }
            }
          } else if (state === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            if (isCreator && socket) {
              socket.emit('video-action', {
                roomId,
                action: 'pause',
                time
              });
            }
          } else if (state === window.YT.PlayerState.BUFFERING) {
            // Buffering might indicate a seek
            if (isCreator && socket && lastStateRef.current === window.YT.PlayerState.PLAYING) {
              // Debounce seek detection during buffering
              if (seekDebounceRef.current) {
                clearTimeout(seekDebounceRef.current);
              }
              seekDebounceRef.current = setTimeout(() => {
                const newTime = event.target.getCurrentTime();
                socket.emit('video-action', {
                  roomId,
                  action: 'seek',
                  time: newTime
                });
              }, 100);
            }
          }
          
          lastSeekTimeRef.current = time;
          lastStateRef.current = state;
        },
      },
    });
  };

  const extractVideoId = (url) => {
    if (!url) return null;
    // YouTube
    const youtubeRegex = /(?:youtube\\.com\\/(?:[^\\/\\n\\s]+\\/\\S+\\/|(?:v|e(?:mbed)?)\\/|\\S*?[?&]v=)|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) return youtubeMatch[1];

    // Dailymotion
    const dailymotionRegex = /dailymotion\\.com\\/video\\/([a-zA-Z0-9]+)/;
    const dailymotionMatch = url.match(dailymotionRegex);
    if (dailymotionMatch) return dailymotionMatch[1];

    return null;
  };

  const handleSeek = (e) => {
    if (!player || !isCreator) return;
    const time = parseFloat(e.target.value);
    player.seekTo(time, true);
    setCurrentTime(time);
    if (socket) {
      socket.emit('video-action', {
        roomId,
        action: 'seek',
        time
      });
    }
  };

  const handleProgressClick = (e) => {
    if (!player || !isCreator) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percent = clickX / width;
    const time = percent * duration;
    
    player.seekTo(time, true);
    setCurrentTime(time);
    if (socket) {
      socket.emit('video-action', {
        roomId,
        action: 'seek',
        time
      });
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        <div id="youtube-player" ref={playerRef} className="absolute inset-0"></div>
      </div>

      {/* Custom Progress Bar - Visible for all, only creator can control */}
      <div className="mt-3">
        {/* Progress Bar */}
        <div 
          className={`relative h-2 bg-[#2d2d44] rounded-lg overflow-hidden ${isCreator ? 'cursor-pointer' : ''}`}
          onClick={handleProgressClick}
        >
          <div 
            className="absolute h-full bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Time Display */}
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        
        {/* Creator Controls */}
        {isCreator && (
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-2 bg-[#2d2d44] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
