const LJM_SCRIPT = "ljmScript";
const BASE_SOURCE = "https://8x8.vc/libs/lib-jitsi-meet.min.js";
const BASE_SOURCE_STAGE = "https://stage.8x8.vc/libs/lib-jitsi-meet.min.js";
const REGION_SHARD_MAPPING = {
  default: "default",
  frankfurt: "eu-central-1",
  london: "eu-west-2",
};
const TRANSCRIPT_LANGUAGES = ["en-US", "es-ES"];
const INVALID_CLASS = "is-invalid";
const HIDE_CLASS = "d-none";

const tenant = "vpaas-magic-cookie-e13bc443bcb5491598b38dde2cbbfc54";
const roomName = "dada";
let options;
let token =
  "eyJraWQiOiJ2cGFhcy1tYWdpYy1jb29raWUtZTEzYmM0NDNiY2I1NDkxNTk4YjM4ZGRlMmNiYmZjNTQvYzQ1ZDAzLVNBTVBMRV9BUFAiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJqaXRzaSIsImlzcyI6ImNoYXQiLCJpYXQiOjE2Nzc3Nzg2MTIsImV4cCI6MTY3Nzc4NTgxMiwibmJmIjoxNjc3Nzc4NjA3LCJzdWIiOiJ2cGFhcy1tYWdpYy1jb29raWUtZTEzYmM0NDNiY2I1NDkxNTk4YjM4ZGRlMmNiYmZjNTQiLCJjb250ZXh0Ijp7ImZlYXR1cmVzIjp7ImxpdmVzdHJlYW1pbmciOnRydWUsIm91dGJvdW5kLWNhbGwiOnRydWUsInNpcC1vdXRib3VuZC1jYWxsIjpmYWxzZSwidHJhbnNjcmlwdGlvbiI6dHJ1ZSwicmVjb3JkaW5nIjp0cnVlfSwidXNlciI6eyJoaWRkZW4tZnJvbS1yZWNvcmRlciI6ZmFsc2UsIm1vZGVyYXRvciI6dHJ1ZSwibmFtZSI6Im1qdW5haWQ3ODQzIiwiaWQiOiJnb29nbGUtb2F1dGgyfDEwNjc3OTc5MTgxNjg5NDQ1MjQ1MyIsImF2YXRhciI6IiIsImVtYWlsIjoibWp1bmFpZDc4NDNAZ21haWwuY29tIn19LCJyb29tIjoiKiJ9.jafpH2bGBNrkMBuWRTBxIjoa8x5vElMiU_swWbvpAZgwhQ_Ou2NdNe4RQx0H1M2rKC4q52WRHmxTnRlyh982k1OQavYW811q5CPBNQ-HJoCSKIX5NHfKytbAML7oiiPC_iUiu4xExkKEb4q1r0DC9Qz1DZSgNMW8eYpAL0EvAbvLwypvuwvHZtM9brhQMWoP2cDz2sLypLuxPXLHEjH-abnqx8Hbecr9eqDGVIOnoOheeXC_3nS_USVI9-OUYIbeGyyU78jv3Grt3nUkix_eQf-HtgzHSO-6KYrfUweWbDJoMxSdX2q7emofKlzTCpJYXEkiYxYUsvew1OwsG_N_BA";
let releaseVersion = "1";
let useStage;

function buildOptions() {
  const selectedRegion = "default";
  const hasRegion = selectedRegion !== "default";
  const region = hasRegion ? `${selectedRegion}.` : "";
  const stage = useStage ? "stage." : "";
  const subdomain = useStage ? stage : region;
  const release = "1";
  const releaseVersion = release ? `?release=release-${release}` : "";
  const room = roomName;
  return {
    // Connection
    hosts: {
      domain: `${stage}8x8.vc`,
      muc: `conference.${tenant}.${stage}8x8.vc`,
      focus: `focus.${stage}8x8.vc`,
    },
    serviceUrl: `wss://${subdomain}8x8.vc/${tenant}/xmpp-websocket?room=${room}${releaseVersion}`,
    websocketKeepAliveUrl: `https://${subdomain}8x8.vc/${tenant}/_unlock?room=${room}`,

    // Video quality / constraints
    constraints: {
      video: {
        height: {
          ideal: 720,
          max: 720,
          min: 180,
        },
        width: {
          ideal: 1280,
          max: 1280,
          min: 320,
        },
      },
    },
    channelLastN: 25,

    // Enable Peer-to-Peer for 1-1 calls
    p2p: {
      enabled: true,
    },

    // Enable Callstats (note, none of this is secret, despite its name)
    callStatsID: "706724306",
    callStatsSecret:
      "f+TKWryzPOyX:dNR8PMw42WJwM3YM1XkJUjPOLY0M40wz+0D4mZud8mQ=",
    confID: `https://${stage}8x8.vc/${tenant}/${room}`,
    siteID: tenant,
    applicationName: "My Sample JaaS App",

    // Misc
    deploymentInfo: hasRegion
      ? { userRegion: REGION_SHARD_MAPPING[selectedRegion] }
      : {},

    // Logging
    logging: {
      // Default log level
      defaultLogLevel: "trace",

      // The following are too verbose in their logging with the default level
      "modules/RTC/TraceablePeerConnection.js": "info",
      "modules/statistics/CallStats.js": "info",
      "modules/xmpp/strophe.util.js": "log",
    },

    // End marker, disregard
    __end: true,
  };
}

let connection = null;
let room = null;

let localTracks = [];
const remoteTracks = {};
let participantIds = new Set();

const cleanupDOM = (id) => {
  const element = document.getElementById(id);
  element && element.remove();
};

const removeInactiveVideos = () => {
  const videos = document.querySelectorAll("video");

  console.log(videos);

  for (let i = 0; i < videos.length; i++) {
    if (!videos[i].srcObject.active) videos[i].remove();
  }
};

const onLocalTracks = (tracks) => {
  localTracks = tracks;

  for (let i = 0; i < localTracks.length; i++) {
    if (localTracks[i].getType() === "video") {
      const videoId = `localVideo${i}`;
      cleanupDOM(videoId);

      let videoNode = document.createElement("video");
      videoNode.id = videoId;
      videoNode.className = "video";
      videoNode.autoplay = "1";
      document.getElementById("lc").appendChild(videoNode);
      const localVideo = document.getElementById(videoId);
      localTracks[i].attach(localVideo);
    } else {
      const audioId = `localAudio${i}`;
      cleanupDOM(audioId);

      let audioNode = document.createElement("audio");
      audioNode.id = audioId;
      audioNode.autoplay = false;
      document.body.appendChild(audioNode);
      const localAudio = document.getElementById(audioId);
      localTracks[i].attach(localAudio);
    }
  }
};

const onRemoteTrack = (track) => {
  const participant = track.getParticipantId();

  if (!remoteTracks[participant]) {
    remoteTracks[participant] = [];
  }
  const idx = remoteTracks[participant].push(track);
  const id = participant + track.getType() + idx;

  console.log(remoteTracks);

  if (track.getType() === "video") {
    const videoId = `${participant}video${idx}`;
    cleanupDOM(videoId);

    let videoNode = document.createElement("video");
    videoNode.id = videoId;
    videoNode.className = "video";
    videoNode.autoplay = "1";
    document.getElementById("lc").appendChild(videoNode);
  } else {
    const audioId = `${participant}audio${idx}`;
    cleanupDOM(audioId);

    let audioNode = document.createElement("audio");
    audioNode.id = audioId;
    audioNode.autoplay = "1";
    document.body.appendChild(audioNode);
  }
  const remoteTrack = document.getElementById(id);
  track.attach(remoteTrack);
};

const onConferenceJoined = () => {
  console.log("conference joined!");
  const selectedTranscript = "en-US";
  room.setLocalParticipantProperty("requestingTranscription", true);
  room.setLocalParticipantProperty(
    "transcription_language",
    selectedTranscript
  );
};

const onConferenceLeft = () => {
  console.log("conference left!");
};

const onUserJoined = (id) => {
  console.log("user joined!");

  participantIds.add(id);

  // Select all participants so we can receive video
  room.selectParticipants(Array.from(participantIds));
};

const onUserLeft = (id) => {
  console.log("user left!");

  participantIds.delete(id);

  room.selectParticipants(Array.from(participantIds));
};

const onConnectionSuccess = () => {
  room = connection.initJitsiConference(roomName, options);

  // Add local tracks before joining
  for (let i = 0; i < localTracks.length; i++) {
    room.addTrack(localTracks[i]);
  }

  console.log(localTracks);

  // Setup event listeners
  room.on(JitsiMeetJS.events.conference.TRACK_ADDED, (track) => {
    !track.isLocal() && onRemoteTrack(track);
  });
  room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, onConferenceJoined);
  room.on(JitsiMeetJS.events.conference.CONFERENCE_LEFT, onConferenceLeft);
  room.on(JitsiMeetJS.events.conference.USER_JOINED, onUserJoined);
  room.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);

  room.on(
    JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED,
    (...args) => {
      console.log("RECEIVED ENDPOINT MESSAGE", args);
    }
  );

  // Join
  room.join();
  room.setSenderVideoConstraint(720); // Send at most 720p
  room.setReceiverVideoConstraint(360); // Receive at most 360p for each participant
};

const onConnectionFailed = () => {
  console.error("connection failed!");
};

const canvas = document.getElementById("myCanvas");
const toolbar = document.getElementById("stroke");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#FFFFFF"; // set fill color to white
ctx.fillRect(0, 0, canvas.width, canvas.height);
let color = "#0000FF"; // default color is blue
let isDrawing = false;

function startDrawing(e) {
  isDrawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
}

function draw(e) {
  if (!isDrawing) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.stroke();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFFF"; // set fill color to white
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function stopDrawing() {
  isDrawing = false;
}

function changeColor() {
  color = toolbar.value;
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);
toolbar.addEventListener("input", changeColor);

const canvasStream = canvas.captureStream();
const videoTrack = canvasStream.getVideoTracks()[0];
const customMediaStream = new MediaStream([videoTrack]);
const customMediaStreamTrack = customMediaStream.getTracks()[0].clone();

const connect = async () => {
  options = buildOptions(releaseVersion);

  // Initialize lib-jitsi-meet
  JitsiMeetJS.init(options);

  // Initialize logging.
  JitsiMeetJS.setLogLevel(options.logging.defaultLogLevel);

  for (const [loggerId, level] of Object.entries(options.logging)) {
    if (loggerId !== "defaultLogLevel") {
      JitsiMeetJS.setLogLevelById(level, loggerId);
    }
  }

  const tracks = await JitsiMeetJS.createLocalTracks({
    devices: ["video"],
    cameraDeviceId: "default",
    micDeviceId: "default",
  });

  const canvasTrack = await JitsiMeetJS.createLocalTracks({
    devices: ["video"],
    videoType: "videoinput",
    mediaStream: canvasStream,
    maxFps: 10,
    resolution: 200,
    videoQuality: {
      maxBitrate: {
        ideal: 800000,
        max: 800000,
      },
    },
  })
    .then((track) => {
      console.log(track);
      track[0].stream = customMediaStream;
      track[0].track = customMediaStreamTrack;
      return track[0];
    })
    .catch((error) => {
      console.error("Failed to create local track", error);
    });

  console.log(customMediaStream);
  console.log(canvasTrack);
  console.log(tracks);

  tracks.push(canvasTrack);
  onLocalTracks(tracks);

  connection = new JitsiMeetJS.JitsiConnection(null, token, options);
  console.log(`using LJM version ${JitsiMeetJS.version}!`);

  connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    onConnectionSuccess
  );
  connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_FAILED,
    onConnectionFailed
  );
  connection.addEventListener(
    JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
    disconnect
  );

  return connection.connect();
};

// [testing purposes] Cleanup DOM of remote tracks.
const removeRemoteTracks = () => {
  const remoteVideo = document.getElementsByTagName("video");
  const remoteAudio = document.getElementsByTagName("audio");

  for (let i = remoteVideo.length - 1; i >= 0; i--) {
    remoteVideo[i].remove();
  }
  for (let i = remoteAudio.length - 1; i >= 0; i--) {
    remoteAudio[i].remove();
  }
};

// Close all resources when closing the page.
const disconnect = async () => {
  console.log("disconnect!");

  connection.removeEventListener(
    JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
    onConnectionSuccess
  );
  connection.removeEventListener(
    JitsiMeetJS.events.connection.CONNECTION_FAILED,
    onConnectionFailed
  );
  connection.removeEventListener(
    JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
    disconnect
  );

  for (let i = 0; i < localTracks.length; i++) {
    localTracks[i].dispose();
  }

  return await connection.disconnect();
};

// Restart the connection.
const reload = async () => {
  // [testing purposes] Disconnect all participants to apply the latest release.
  removeRemoteTracks();

  await disconnect();
  await connect();
};

// Leave the room and proceed to cleanup.
const hangup = async () => {
  removeRemoteTracks();

  if (room) {
    await room.leave();
  }

  await disconnect();
};
// [testing purposes] Notify that a connection reload is necessary to apply a different ljm script.
const signalReload = () => {
  const RELOAD_BUTTON = "reloadButton";
  if (
    document.getElementById(RELOAD_BUTTON) ||
    !document.getElementsByTagName("video").length
  ) {
    return;
  }

  let reloadButton = document.createElement("button");
  reloadButton.id = RELOAD_BUTTON;
  reloadButton.className = "btn btn-outline-secondary bi bi-arrow-clockwise";
  goButton.parentElement.appendChild(reloadButton);

  reloadButton.addEventListener("click", async () => {
    reload();
    reloadButton.remove();
  });
};

const updateLjmScript = (releaseVersionValue, shouldUseStage) => {
  console.log(`removing LJM version ${JitsiMeetJS.version}!`);

  const currentVersionScript = document.getElementById(LJM_SCRIPT);
  const releaseVersionParam = releaseVersionValue
    ? `?release=release-${releaseVersionValue}`
    : "";
  const baseSource = shouldUseStage ? BASE_SOURCE_STAGE : BASE_SOURCE;
  let nextVersionScript = document.createElement("script");
  nextVersionScript.id = LJM_SCRIPT;
  nextVersionScript.src = `${baseSource}${releaseVersionParam}`;

  currentVersionScript.remove();
  document.body.appendChild(nextVersionScript);

  signalReload();
};

const handleUseStageUpdate = async (event) => {
  useStage = event.target.checked;

  const regionInputParent =
    document.getElementById("regionInput").parentElement;
  if (useStage) {
    regionInputParent.classList.add(HIDE_CLASS);
  } else {
    regionInputParent.classList.contains(HIDE_CLASS) &&
      regionInputParent.classList.remove(HIDE_CLASS);
  }

  updateLjmScript(releaseVersion, useStage);
};

window.addEventListener("beforeunload", disconnect);
window.addEventListener("unload", disconnect);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const goButton = document.getElementById("goButton");
  const hangupButton = document.getElementById("hangupButton");

  form.addEventListener("submit", (event) => event.preventDefault());
  goButton.addEventListener("click", connect);
  hangupButton.addEventListener("click", hangup);
});

setInterval(removeInactiveVideos, 1000);
