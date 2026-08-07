import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

export default function VoiceChat({ socket, roomId, user }) {
  const [isMuted, setIsMuted] = useState(true);
  const [peerId, setPeerId] = useState(null);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!socket || !user) return;

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      socket.emit('peer-id', { roomId, peerId: id });
    });

    peer.on('call', (call) => {
      if (streamRef.current) {
        call.answer(streamRef.current);
        call.on('stream', (remoteStream) => {
          playRemoteStream(remoteStream, call.peer);
        });
      }
    });

    peer.on('error', (err) => {
      console.error('PeerJS error:', err);
    });

    const handlePeerConnected = (data) => {
      if (data.user.id !== user.id && streamRef.current) {
        const call = peer.call(data.peerId, streamRef.current);
        if (call) {
          call.on('stream', (remoteStream) => {
            playRemoteStream(remoteStream, data.peerId);
          });
        }
      }
      setConnectedPeers((prev) => [...prev, { peerId: data.peerId, user: data.user }]);
    };

    const handlePeerDisconnected = (data) => {
      setConnectedPeers((prev) => prev.filter((p) => p.user.id !== data.user.id));
    };

    socket.on('peer-connected', handlePeerConnected);
    socket.on('peer-disconnected', handlePeerDisconnected);

    return () => {
      socket.off('peer-connected', handlePeerConnected);
      socket.off('peer-disconnected', handlePeerDisconnected);
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      stopAudio();
    };
  }, [socket, roomId, user]);

  const playRemoteStream = (stream, peerId) => {
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.id = `audio-${peerId}`;
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  const stopAudio = () => {
    document.querySelectorAll('audio[id^="audio-"]').forEach((el) => el.remove());
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const toggleMute = async () => {
    if (isMuted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // Create audio context to keep mic active
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        source.connect(analyser);
        
        setIsMuted(false);
        socket.emit('peer-id', { roomId, peerId: peerRef.current?.id });
      } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('لطفا دسترسی میکروفون را فعال کنید');
      }
    } else {
      stopAudio();
      streamRef.current = null;
      setIsMuted(true);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleMute}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
          isMuted
            ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            : 'bg-red-500 text-white mic-active'
        }`}
        title={isMuted ? 'روشن کردن میکروفون' : 'خاموش کردن میکروفون'}
      >
        {isMuted ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
        <span className="text-sm">{isMuted ? 'میک خاموش' : 'میک روشن'}</span>
      </button>

      {connectedPeers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>{connectedPeers.length} نفر متصل</span>
        </div>
      )}
    </div>
  );
}
