import { useState, useEffect, useRef } from 'react';

export default function VideoPlayer({ videoUrl, isCreator, socket, roomId }) {
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const isUpdatingRef = useRef(false);

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

  useEffect(() => {
    if (!socket) return;

    const handleVideoAction = (data) => {
      if (!player || isCreator) return;
      
      isUpdatingRef.current = true;
      
      if (data.action === 'play') {
        player.playVideo();
        setIsPlaying(true);
      } else if (data.action === 'pause') {
        player.pauseVideo();
        setIsPlaying(false);
      } else if (data.action === 'seek') {
        player.seekTo(data.time, true);
        setCurrentTime(data.time);
      }
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 500);
    };

    const handleVideoState = (data) => {
      if (!player || isCreator) return;
      
      isUpdatingRef.current = true;
      
      if (data.action === 'play') {
        player.seekTo(data.time, true);
        player.playVideo();
        setIsPlaying(true);
      } else if (data.action === 'pause') {
        player.seekTo(data.time, true);
        player.pauseVideo();
        setIsPlaying(false);
      }
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 500);
    };

    socket.on('video-action', handleVideoAction);
    socket.on('video-state', handleVideoState);

    return () => {
      socket.off('video-action', handleVideoAction);
      socket.off('video-state', handleVideoState);
    };
  }, [socket, player, isCreator]);

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

          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            if (isCreator && socket) {
              socket.emit('video-action', {
                roomId,
                action: 'play',
                time
              });
            }
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            if (isCreator && socket) {
              socket.emit('video-action', {
                roomId,
                action: 'pause',
                time
              });
            }
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
