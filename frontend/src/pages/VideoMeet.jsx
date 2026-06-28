import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import styles from "../styles/videoComponent.module.css";
import server from "../environment";

const server_url = server;

let connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const colorPalette = [
  "#5b8def",
  "#7c6cf2",
  "#2f9d8f",
  "#b7791f",
  "#c05621",
  "#b83280",
  "#00897b",
  "#546e7a",
];

const getInitial = (name = "") => {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "U";
};

const getAvatarColor = (name = "") => {
  const seed = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colorPalette[seed % colorPalette.length];
};

const RemoteTile = memo(function RemoteTile({
  participant,
  stagedId,
  onStageToggle,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const hasActiveVideo = participant.videoEnabled && !!participant.stream;
  const isStaged = stagedId === participant.socketId;

  useEffect(() => {
    if (participant.stream && participant.videoEnabled && videoRef.current) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }

      const playPromise = videoRef.current.play?.();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (participant.stream && audioRef.current) {
      if (audioRef.current.srcObject !== participant.stream) {
        audioRef.current.srcObject = participant.stream;
      }

      audioRef.current.muted = false;
      const audioPlayPromise = audioRef.current.play?.();
      if (audioPlayPromise && typeof audioPlayPromise.catch === "function") {
        audioPlayPromise.catch((err) => {
          console.log("Remote audio play blocked:", err);
        });
      }
    } else if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  }, [participant.stream, participant.videoEnabled]);

  return (
    <div
      className={`${styles.participantTile} ${
        isStaged ? styles.participantTileExpanded : ""
      }`}
      onClick={() => onStageToggle(participant.socketId)}
    >
      <audio ref={audioRef} autoPlay playsInline />

      {hasActiveVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={styles.participantVideo}
        />
      ) : (
        <div
          className={styles.avatarTile}
          style={{ backgroundColor: getAvatarColor(participant.username) }}
        >
          <span>{getInitial(participant.username)}</span>
        </div>
      )}

      <div className={styles.participantMeta}>
        <span>{participant.username || "Guest"}</span>
      </div>
    </div>
  );
});

export default function VideoMeetComponent() {
  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const roomUrlRef = useRef(window.location.href);

  const lobbyVideoRef = useRef(null);
  const selfVideoRef = useRef(null);

  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const currentVideoTrackRef = useRef(null);
  const currentAudioTrackRef = useRef(null);

  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [screen, setScreen] = useState(false);
  const [showModal, setModal] = useState(true);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);
  const [selfViewSmall, setSelfViewSmall] = useState(true);
  const [centerStageId, setCenterStageId] = useState(null);

  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    const context = canvas.getContext("2d");
    context.fillStyle = "black";
    context.fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0];
    track.enabled = false;
    return track;
  };

  const silence = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    track.enabled = false;
    return track;
  };

  const getCameraTrack = useCallback(() => {
    return cameraStreamRef.current?.getVideoTracks?.()[0] || null;
  }, []);

  const getMicTrack = useCallback(() => {
    return cameraStreamRef.current?.getAudioTracks?.()[0] || null;
  }, []);

  const syncLobbyPreview = useCallback((stream) => {
    const videoEl = lobbyVideoRef.current;
    if (!videoEl || !stream) return;

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }

    videoEl.muted = true;
    videoEl.playsInline = true;

    const playPromise = videoEl.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }, []);

  const refreshSelfPreview = useCallback(() => {
    const videoEl = selfVideoRef.current;
    if (!videoEl) return;

    if (screen && screenStreamRef.current) {
      if (videoEl.srcObject !== screenStreamRef.current) {
        videoEl.srcObject = screenStreamRef.current;
      }
    } else if (video && cameraStreamRef.current) {
      if (videoEl.srcObject !== cameraStreamRef.current) {
        videoEl.srcObject = cameraStreamRef.current;
      }
    } else {
      videoEl.srcObject = null;
      return;
    }

    videoEl.muted = true;
    videoEl.playsInline = true;

    const playPromise = videoEl.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }, [screen, video]);

  useEffect(() => {
    refreshSelfPreview();
  }, [refreshSelfPreview]);

  const upsertParticipant = useCallback((socketId, data = {}) => {
    setVideos((prev) => {
      const exists = prev.some((item) => item.socketId === socketId);

      if (exists) {
        return prev.map((item) =>
          item.socketId === socketId ? { ...item, ...data } : item
        );
      }

      return [
        ...prev,
        {
          socketId,
          stream: null,
          username: data.username || "Guest",
          videoEnabled:
            typeof data.videoEnabled === "boolean" ? data.videoEnabled : true,
          audioEnabled:
            typeof data.audioEnabled === "boolean" ? data.audioEnabled : true,
        },
      ];
    });
  }, []);

  const replaceOutgoingTrack = useCallback(async (kind, newTrack) => {
    const peerConnections = Object.values(connections);

    await Promise.all(
      peerConnections.map(async (peerConnection) => {
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track && s.track.kind === kind);

        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      })
    );
  }, []);

  const emitMediaState = useCallback(
    (overrides = {}) => {
      if (!socketRef.current) return;

      socketRef.current.emit("media-state-change", {
        roomId: roomUrlRef.current,
        socketId: socketIdRef.current,
        username,
        videoEnabled:
          typeof overrides.videoEnabled === "boolean"
            ? overrides.videoEnabled
            : video,
        audioEnabled:
          typeof overrides.audioEnabled === "boolean"
            ? overrides.audioEnabled
            : audio,
      });
    },
    [audio, username, video]
  );

  const attachLocalTracksToPeer = useCallback((peerConnection) => {
    const senders = peerConnection.getSenders();
    const videoTrack = currentVideoTrackRef.current || black();
    const audioTrack = currentAudioTrackRef.current || silence();
    const stream = new MediaStream([videoTrack, audioTrack]);

    [videoTrack, audioTrack].forEach((track) => {
      const existingSender = senders.find(
        (sender) => sender.track && sender.track.kind === track.kind
      );

      if (existingSender) {
        existingSender.replaceTrack(track).catch((error) => console.log(error));
      } else {
        peerConnection.addTrack(track, stream);
      }
    });
  }, []);

  const createPeerConnection = useCallback(
    (socketListId, remoteUsername = "Guest") => {
      if (connections[socketListId]) {
        return connections[socketListId];
      }

      const peerConnection = new RTCPeerConnection(peerConfigConnections);

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit(
            "signal",
            socketListId,
            JSON.stringify({ ice: event.candidate })
          );
        }
      };

      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          upsertParticipant(socketListId, { stream: remoteStream });
        }
      };

      attachLocalTracksToPeer(peerConnection);
      connections[socketListId] = peerConnection;

      upsertParticipant(socketListId, {
        username: remoteUsername,
        videoEnabled: true,
        audioEnabled: true,
      });

      return peerConnection;
    },
    [attachLocalTracksToPeer, upsertParticipant]
  );

  const createAndSendOffer = useCallback(
    async (socketListId) => {
      const peerConnection = connections[socketListId];
      if (!peerConnection || peerConnection.signalingState !== "stable") return;

      try {
        const description = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(description);

        if (socketRef.current) {
          socketRef.current.emit(
            "signal",
            socketListId,
            JSON.stringify({
              sdp: peerConnection.localDescription,
              username,
            })
          );
        }
      } catch (error) {
        console.log(error);
      }
    },
    [username]
  );

  const initializeMedia = useCallback(async () => {
    try {
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 24, max: 24 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      cameraStreamRef.current = userMediaStream;

      const camTrack = getCameraTrack();
      const micTrack = getMicTrack();

      setVideoAvailable(!!camTrack);
      setAudioAvailable(!!micTrack);
      setVideo(!!camTrack);
      setAudio(!!micTrack);

      currentVideoTrackRef.current = camTrack || black();
      currentAudioTrackRef.current = micTrack || silence();

      syncLobbyPreview(userMediaStream);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    } catch (error) {
      console.log(error);
      setVideoAvailable(false);
      setAudioAvailable(false);
      setVideo(false);
      setAudio(false);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    }
  }, [getCameraTrack, getMicTrack, syncLobbyPreview]);

  useEffect(() => {
    initializeMedia();

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      Object.values(connections).forEach((peer) => {
        try {
          peer.close();
        } catch (error) {
          console.log(error);
        }
      });

      connections = {};
    };
  }, [initializeMedia]);

  const gotMessageFromServer = useCallback(
    async (fromId, message) => {
      if (fromId === socketIdRef.current) return;

      const signal = JSON.parse(message);
      const peerConnection = createPeerConnection(fromId, signal.username || "Guest");

      if (signal.username) {
        upsertParticipant(fromId, { username: signal.username });
      }

      try {
        if (signal.sdp) {
          const offerCollision =
            signal.sdp.type === "offer" &&
            peerConnection.signalingState !== "stable";

          if (offerCollision) return;

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(signal.sdp)
          );

          if (signal.sdp.type === "offer") {
            const description = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(description);

            if (socketRef.current) {
              socketRef.current.emit(
                "signal",
                fromId,
                JSON.stringify({
                  sdp: peerConnection.localDescription,
                  username,
                })
              );
            }
          }
        }

        if (signal.ice) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
        }
      } catch (error) {
        console.log(error);
      }
    },
    [createPeerConnection, upsertParticipant, username]
  );

  const addMessage = useCallback((data, sender, socketIdSender) => {
    setMessages((prevMessages) => [...prevMessages, { sender, data }]);

    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  }, []);

  const connectToSocketServer = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io.connect(server_url, { secure: false });
    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("media-state-changed", (payload) => {
      if (!payload || payload.socketId === socketIdRef.current) return;

      upsertParticipant(payload.socketId, {
        username: payload.username || "Guest",
        videoEnabled:
          typeof payload.videoEnabled === "boolean" ? payload.videoEnabled : true,
        audioEnabled:
          typeof payload.audioEnabled === "boolean" ? payload.audioEnabled : true,
      });
    });

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", roomUrlRef.current);

      socketRef.current.off("chat-message");
      socketRef.current.on("chat-message", addMessage);

      socketRef.current.off("user-left");
      socketRef.current.on("user-left", (id) => {
        setVideos((prev) => prev.filter((videoItem) => videoItem.socketId !== id));
        setCenterStageId((prev) => (prev === id ? null : prev));

        if (connections[id]) {
          try {
            connections[id].close();
          } catch (error) {
            console.log(error);
          }
          delete connections[id];
        }
      });

      socketRef.current.off("user-joined");
      socketRef.current.on("user-joined", async (id, clients) => {
        clients.forEach((socketListId) => {
          if (socketListId !== socketIdRef.current) {
            createPeerConnection(socketListId, "Guest");
          }
        });

        if (id === socketIdRef.current) {
          for (const id2 of clients) {
            if (id2 === socketIdRef.current) continue;
            await createAndSendOffer(id2);
          }
        }

        emitMediaState({
          videoEnabled: video,
          audioEnabled: audio,
        });
      });
    });
  }, [
    addMessage,
    audio,
    createAndSendOffer,
    createPeerConnection,
    emitMediaState,
    gotMessageFromServer,
    upsertParticipant,
    video,
  ]);

  const startScreenShare = useCallback(async () => {
    if (!navigator.mediaDevices.getDisplayMedia) return;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 15, max: 15 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      screenStreamRef.current = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      currentVideoTrackRef.current = screenTrack;
      await replaceOutgoingTrack("video", screenTrack);
      setScreen(true);
      refreshSelfPreview();

      screenTrack.onended = async () => {
        const camTrack = video && getCameraTrack() ? getCameraTrack() : black();
        currentVideoTrackRef.current = camTrack;
        await replaceOutgoingTrack("video", camTrack);
        screenStreamRef.current = null;
        setScreen(false);
      };
    } catch (error) {
      console.log(error);
      setScreen(false);
    }
  }, [getCameraTrack, refreshSelfPreview, replaceOutgoingTrack, video]);

  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    const camTrack = video && getCameraTrack() ? getCameraTrack() : black();
    currentVideoTrackRef.current = camTrack;
    await replaceOutgoingTrack("video", camTrack);
    setScreen(false);
  }, [getCameraTrack, replaceOutgoingTrack, video]);

  const handleVideo = useCallback(async () => {
    const camTrack = getCameraTrack();
    if (!camTrack) return;

    const nextEnabled = !video;

    if (nextEnabled) {
      camTrack.enabled = true;

      if (!screen) {
        currentVideoTrackRef.current = camTrack;
        await replaceOutgoingTrack("video", camTrack);
      }

      setVideo(true);
      emitMediaState({ videoEnabled: true });
      return;
    }

    camTrack.enabled = false;

    if (!screen) {
      const blackTrack = black();
      currentVideoTrackRef.current = blackTrack;
      await replaceOutgoingTrack("video", blackTrack);
    }

    setVideo(false);
    emitMediaState({ videoEnabled: false });
  }, [emitMediaState, getCameraTrack, replaceOutgoingTrack, screen, video]);

  const handleAudio = useCallback(async () => {
    const micTrack = getMicTrack();
    if (!micTrack) return;

    const nextEnabled = !audio;
    micTrack.enabled = nextEnabled;
    setAudio(nextEnabled);

    currentAudioTrackRef.current = nextEnabled ? micTrack : silence();
    await replaceOutgoingTrack("audio", currentAudioTrackRef.current);
    emitMediaState({ audioEnabled: nextEnabled });
  }, [audio, emitMediaState, getMicTrack, replaceOutgoingTrack]);

  const handleScreen = useCallback(() => {
    if (screen) stopScreenShare();
    else startScreenShare();
  }, [screen, startScreenShare, stopScreenShare]);

  const handleEndCall = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    Object.values(connections).forEach((peer) => {
      try {
        peer.close();
      } catch (error) {
        console.log(error);
      }
    });

    connections = {};
    window.location.href = "/";
  }, []);

  const sendMessage = useCallback(() => {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  }, [message, username]);

  const connect = useCallback(() => {
    if (!username.trim()) return;
    setAskForUsername(false);
    connectToSocketServer();
  }, [connectToSocketServer, username]);

  const toggleChat = useCallback(() => {
    const nextValue = !showModal;
    setModal(nextValue);
    if (nextValue) setNewMessages(0);
  }, [showModal]);

  const toggleExpandedTile = useCallback((socketId) => {
    setCenterStageId((prev) => (prev === socketId ? null : socketId));
  }, []);

  const orderedVideos = useMemo(() => {
    if (!centerStageId) return videos;

    const staged = videos.find((v) => v.socketId === centerStageId);
    const others = videos.filter((v) => v.socketId !== centerStageId);

    return staged ? [staged, ...others] : videos;
  }, [centerStageId, videos]);

  const localInitial = getInitial(username);
  const localColor = getAvatarColor(username);

  return (
    <div>
      {askForUsername ? (
        <div className={styles.lobbyContainer}>
          <div className={styles.lobbyCard}>
            <div className={styles.lobbyLeft}>
              <h2>Enter into Lobby</h2>
              <p>Set your name and join the room with audio and video.</p>

              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                variant="outlined"
                fullWidth
              />

              <Button variant="contained" onClick={connect}>
                Connect
              </Button>
            </div>

            <div className={styles.lobbyPreview}>
              <video ref={lobbyVideoRef} autoPlay muted playsInline />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          <div
            className={`${styles.meetingShell} ${
              !showModal ? styles.meetingShellFull : ""
            }`}
          >
            <div className={styles.stageColumn}>
              <div className={styles.stageSurface}>
                <div
                  className={`${styles.conferenceView} ${
                    showModal ? styles.conferenceWithChat : ""
                  }`}
                >
                  {orderedVideos.length > 0 ? (
                    orderedVideos.map((participant) => (
                      <RemoteTile
                        key={participant.socketId}
                        participant={participant}
                        stagedId={centerStageId}
                        onStageToggle={toggleExpandedTile}
                      />
                    ))
                  ) : (
                    <div className={styles.emptyStage}>Waiting for participants…</div>
                  )}
                </div>

                <div
                  className={`${styles.selfViewWrapper} ${
                    selfViewSmall ? styles.selfViewSmall : styles.selfViewLarge
                  }`}
                  onClick={() => setSelfViewSmall((prev) => !prev)}
                >
                  <video
                    className={styles.meetUserVideo}
                    ref={selfVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ display: video || screen ? "block" : "none" }}
                  />

                  {!video && !screen ? (
                    <div
                      className={styles.avatarTile}
                      style={{ backgroundColor: localColor }}
                    >
                      <span>{localInitial}</span>
                    </div>
                  ) : null}

                  <div className={styles.participantMeta}>
                    <span>{username || "You"}</span>
                  </div>
                </div>
              </div>
            </div>

            {showModal ? (
              <aside className={styles.chatRoom}>
                <div className={styles.chatContainer}>
                  <h1>Chat</h1>

                  <div className={styles.chattingDisplay}>
                    {messages.length > 0 ? (
                      messages.map((item, index) => (
                        <div className={styles.chatMessage} key={index}>
                          <p className={styles.chatSender}>{item.sender}</p>
                          <p>{item.data}</p>
                        </div>
                      ))
                    ) : (
                      <p>No Messages Yet</p>
                    )}
                  </div>

                  <div className={styles.chattingArea}>
                    <TextField
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      label="Enter your chat"
                      variant="outlined"
                      fullWidth
                      size="small"
                    />
                    <Button variant="contained" onClick={sendMessage}>
                      Send
                    </Button>
                  </div>
                </div>
              </aside>
            ) : null}
          </div>

          <div className={styles.buttonContainers}>
            <IconButton
              onClick={handleVideo}
              style={{ color: videoAvailable ? "white" : "#7d7d7d" }}
              disabled={!videoAvailable}
            >
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>

            <IconButton
              onClick={handleAudio}
              style={{ color: audioAvailable ? "white" : "#7d7d7d" }}
              disabled={!audioAvailable}
            >
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable ? (
              <IconButton onClick={handleScreen} style={{ color: "white" }}>
                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            ) : null}

            <Badge badgeContent={newMessages} max={999} color="error">
              <IconButton onClick={toggleChat} style={{ color: "white" }}>
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}