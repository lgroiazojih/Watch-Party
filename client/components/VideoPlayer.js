import { useState, useEffect, useRef, useCallback } from 'react';

export default function VideoPlayer({ videoUrl, isCreator, socket, roomId }) {
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const isCreatorRef = useRef(isCreator);
  const lastActionRef = useRef(null);

  // Keep isCreatorRef in sync
  useEffect(() => {
    isCreatorRef.current = isCreator;
  }, [isCreator]);

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

  // Socket listeners for video actions
  useEffect(() => {
    if (!socket) return;

    const handleVideoAction = (data) => {
      if (!player || isCreatorRef.current) return;
      
      isUpdatingRef.current = true;
      
      if (data.action === 'play') {
        player.seekTo(data.time, true);
        setTimeout(() => {
          player.playVideo();
          setIsPlaying(true);
        }, 100);
      } else if (data.action === 'pause') {
        player.seekTo(data.time, true);
        setTimeout(() => {
          player.pauseVideo();
          setIsPlaying(false);
        }, 100);
      } else if (data.action === 'seek') {
        player.seekTo(data.time, true);
        setCurrentTime(data.time);
      }
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 800);
    };

    socket.on('video-action', handleVideoAction);

    return () => {
      socket.off('video-action', handleVideoAction);
    };
  }, [socket, player]);

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
          if (isUpdatingRef.current) return;
          
          const time = event.target.getCurrentTime();
          setCurrentTime(time);
          const state = event.data;

          // PLAYING state
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            if (isCreatorRef.current && socket) {
              socket.emit('video-action', {
                roomId,
                action: 'play',
                time
              });
            }
          } 
          // PAUSED state
          else if (state === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            if (isCreatorRef.current && socket) {
              socket.emit('video-action', {
                roomId,
                action: 'pause',
                time
              });
            }
          }
          // BUFFERING - detect seek from YouTube progress bar
          else if (state === window.YT.PlayerState.BUFFERING) {
            if (lastActionRef.current === 'play' || lastActionRef.current === 'pause') {
              // This is likely a seek operation
              if (isCreatorRef.current && socket) {
                socket.emit('video-action', {
                  roomId,
                  action: 'seek',
                  time
                });
              }
            }
          }
          
          // Track last action
          if (state === window.YT.PlayerState.PLAYING) {
            lastActionRef.current = 'play';
          } else if (state === window.YT.PlayerState.PAUSED) {
            lastActionRef.current = 'pause';
          }
        },
      },
    });
  };

  const extractVideoId = (url) => {
    if (!url) return null;

    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) return youtubeMatch[1];

    // Dailymotion
    const dailymotionRegex = /dailymotion\.com\/video\/([a-zA-Z0-9]+)/;
    const dailymotionMatch = url.match(dailymotionRegex);
    if (dailymotionMatch) return dailymotionMatch[1];

    return null;
  };

  const handleSeek = (e) => {
    if (!player || !isCreatorRef.current) return;
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        <div id="youtube-player" ref={playerRef} className="absolute inset-0"></div>
      </div>

      {isCreator && (
        <div className="mt-3 flex items-center gap-3 text-sm text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-[#2d2d44] rounded-lg appearance-none cursor-pointer accent-[#8b5cf6]"
          />
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
}
