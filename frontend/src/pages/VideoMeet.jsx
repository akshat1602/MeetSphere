import React, { useEffect, useRef, useState } from "react";
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

export default function VideoMeetComponent() {
  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoref = useRef(null);
  const videoRef = useRef([]);

  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [screen, setScreen] = useState(false);
  const [showModal, setModal] = useState(true);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    getPermissions();

    return () => {
      try {
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        }

        if (window.localStream) {
          window.localStream.getTracks().forEach((track) => track.stop());
        }

        Object.values(connections).forEach((peer) => {
          try {
            peer.close();
          } catch (error) {
            console.log(error);
          }
        });

        connections = {};
      } catch (error) {
        console.log(error);
      }
    };
  }, []);

  useEffect(() => {
    if (!askForUsername) {
      getUserMedia();
    }
  }, [video, audio, askForUsername]);

  useEffect(() => {
    if (screen) {
      getDisplayMedia();
    }
  }, [screen]);

  const getPermissions = async () => {
    try {
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      window.localStream = userMediaStream;

      const hasVideo = userMediaStream.getVideoTracks().length > 0;
      const hasAudio = userMediaStream.getAudioTracks().length > 0;

      setVideoAvailable(hasVideo);
      setAudioAvailable(hasAudio);
      setVideo(hasVideo);
      setAudio(hasAudio);

      if (localVideoref.current) {
        localVideoref.current.srcObject = userMediaStream;
      }

      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    } catch (error) {
      console.log(error);
      setVideoAvailable(false);
      setAudioAvailable(false);
      setVideo(false);
      setAudio(false);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    }
  };

  const getMedia = () => {
    connectToSocketServer();
  };

  const getDisplayMedia = () => {
    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .then(getDisplayMediaSuccess)
        .catch((error) => console.log(error));
    }
  };

  const getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video, audio })
        .then(getUserMediaSuccess)
        .catch((error) => console.log(error));
    } else {
      try {
        if (localVideoref.current?.srcObject) {
          const tracks = localVideoref.current.srcObject.getTracks();
          tracks.forEach((track) => track.stop());
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  const replaceStreamForAllPeers = () => {
    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      try {
        connections[id].addStream(window.localStream);

        connections[id]
          .createOffer()
          .then((description) => {
            connections[id]
              .setLocalDescription(description)
              .then(() => {
                socketRef.current.emit(
                  "signal",
                  id,
                  JSON.stringify({ sdp: connections[id].localDescription })
                );
              })
              .catch((error) => console.log(error));
          })
          .catch((error) => console.log(error));
      } catch (error) {
        console.log(error);
      }
    }
  };

  const getUserMediaSuccess = (stream) => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.log(error);
    }

    window.localStream = stream;

    if (localVideoref.current) {
      localVideoref.current.srcObject = stream;
    }

    replaceStreamForAllPeers();

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);

        try {
          const tracks = localVideoref.current?.srcObject?.getTracks() || [];
          tracks.forEach((item) => item.stop());
        } catch (error) {
          console.log(error);
        }

        const blackSilence = (...args) =>
          new MediaStream([black(...args), silence()]);
        window.localStream = blackSilence();

        if (localVideoref.current) {
          localVideoref.current.srcObject = window.localStream;
        }

        replaceStreamForAllPeers();
      };
    });
  };

  const getDisplayMediaSuccess = (stream) => {
    try {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.log(error);
    }

    window.localStream = stream;

    if (localVideoref.current) {
      localVideoref.current.srcObject = stream;
    }

    replaceStreamForAllPeers();

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setScreen(false);
        getUserMedia();
      };
    });
  };

  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({ sdp: connections[fromId].localDescription })
                      );
                    })
                    .catch((error) => console.log(error));
                })
                .catch((error) => console.log(error));
            }
          })
          .catch((error) => console.log(error));
      }

      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((error) => console.log(error));
      }
    }
  };

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [...prevMessages, { sender, data }]);

    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  const connectToSocketServer = () => {
    if (socketRef.current?.connected) return;

    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", window.location.href);

      socketRef.current.off("chat-message");
      socketRef.current.on("chat-message", addMessage);

      socketRef.current.off("user-left");
      socketRef.current.on("user-left", (id) => {
        setVideos((prev) => prev.filter((videoItem) => videoItem.socketId !== id));

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
      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          if (!connections[socketListId]) {
            connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

            connections[socketListId].onicecandidate = function (event) {
              if (event.candidate != null) {
                socketRef.current.emit(
                  "signal",
                  socketListId,
                  JSON.stringify({ ice: event.candidate })
                );
              }
            };

            connections[socketListId].onaddstream = (event) => {
              const videoExists = videoRef.current.find(
                (videoItem) => videoItem.socketId === socketListId
              );

              if (videoExists) {
                setVideos((prevVideos) => {
                  const updatedVideos = prevVideos.map((videoItem) =>
                    videoItem.socketId === socketListId
                      ? { ...videoItem, stream: event.stream }
                      : videoItem
                  );
                  videoRef.current = updatedVideos;
                  return updatedVideos;
                });
              } else {
                const newVideo = {
                  socketId: socketListId,
                  stream: event.stream,
                  autoplay: true,
                  playsInline: true,
                };

                setVideos((prevVideos) => {
                  const updatedVideos = [...prevVideos, newVideo];
                  videoRef.current = updatedVideos;
                  return updatedVideos;
                });
              }
            };

            if (window.localStream) {
              connections[socketListId].addStream(window.localStream);
            } else {
              const blackSilence = (...args) =>
                new MediaStream([black(...args), silence()]);
              window.localStream = blackSilence();
              connections[socketListId].addStream(window.localStream);
            }
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              connections[id2].addStream(window.localStream);
            } catch (error) {
              console.log(error);
            }

            connections[id2]
              .createOffer()
              .then((description) => {
                connections[id2]
                  .setLocalDescription(description)
                  .then(() => {
                    socketRef.current.emit(
                      "signal",
                      id2,
                      JSON.stringify({ sdp: connections[id2].localDescription })
                    );
                  })
                  .catch((error) => console.log(error));
              })
              .catch((error) => console.log(error));
          }
        }
      });
    });
  };

  const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  const handleVideo = () => {
    setVideo((prev) => !prev);
  };

  const handleAudio = () => {
    setAudio((prev) => !prev);
  };

  const handleScreen = () => {
    setScreen((prev) => !prev);
  };

  const handleEndCall = () => {
    try {
      const tracks = localVideoref.current?.srcObject?.getTracks() || [];
      tracks.forEach((track) => track.stop());
    } catch (error) {
      console.log(error);
    }

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    window.location.href = "/";
  };

  const sendMessage = () => {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  const connect = () => {
    if (!username.trim()) return;
    setAskForUsername(false);
    getMedia();
  };

  const toggleChat = () => {
    const nextValue = !showModal;
    setModal(nextValue);
    if (nextValue) {
      setNewMessages(0);
    }
  };

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
              <video ref={localVideoref} autoPlay muted playsInline />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {showModal ? (
            <div className={styles.chatRoom}>
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
            </div>
          ) : null}

          <div className={styles.buttonContainers}>
            <IconButton onClick={handleVideo} style={{ color: "white" }}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>

            <IconButton onClick={handleAudio} style={{ color: "white" }}>
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

          <video
            className={`${styles.meetUserVideo} ${showModal ? styles.chatOpenPreview : ""}`}
            ref={localVideoref}
            autoPlay
            muted
            playsInline
          />

          <div className={styles.conferenceView}>
            {videos.map((videoItem) => (
              <div key={videoItem.socketId}>
                <video
                  data-socket={videoItem.socketId}
                  ref={(ref) => {
                    if (ref && videoItem.stream) {
                      ref.srcObject = videoItem.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}