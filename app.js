(function () {
  let dataConnection = null;
  let mediaConnection = null;

  const peersEl = document.querySelector(".peers");
  const sendButtonEl = document.querySelector(".send-new-message-button");
  const newMessageEl = document.querySelector(".new-message");
  const messagesEl = document.querySelector(".messages");
  const listpeersButtonEl = document.querySelector(".list-all-peers-button");
  const theirVideoContainer = document.querySelector(".video-container.them");
  const videoOfThemEl = document.querySelector(".video-container.them video");
  const videoOfMeEl = document.querySelector(".video-container.me video");
  const startVideoButtonEl = theirVideoContainer.querySelector(".start");
  const stopVideoButtonEl = theirVideoContainer.querySelector(".stop");

  //Starting "My video".
  navigator.mediaDevices
    .getUserMedia({ audio: false, video: true })
    .then((stream) => {
      videoOfMeEl.muted = true;
      videoOfMeEl.srcObject = stream;
    });

  const printMessage = (text, who) => {
    const Time = new Date();
    const myTimeStamp = `${Time.getHours()}:${Time.getMinutes()}:${Time.getSeconds()}`;
    const messageEl = document.createElement("div");

    messageEl.classList.add("message", who);
    messageEl.innerHTML = `<div>${text}</br>${myTimeStamp}</div>`;
    messagesEl.append(messageEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  // Get peer id (hash) from URL.
  const myPeerId = location.hash.slice(1);

  //connect to peer server.
  let peer = new Peer(myPeerId, {
    host: "glajan.com",
    port: 8443,
    path: "/myapp",
    secure: true,

    // using below information in order to have connections between different peer ID´s.
    config: {
      iceServers: [
        { urls: ["stun:eu-turn7.xirsys.com"] },
        {
          username:
            "1FOoA8xKVaXLjpEXov-qcWt37kFZol89r0FA_7Uu_bX89psvi8IjK3tmEPAHf8EeAAAAAF9NXWZnbGFqYW4=",
          credential: "83d7389e-ebc8-11ea-a8ee-0242ac140004",
          urls: [
            "turn:eu-turn7.xirsys.com:80?transport=udp",
            "turn:eu-turn7.xirsys.com:3478?transport=udp",
            "turn:eu-turn7.xirsys.com:80?transport=tcp",
            "turn:eu-turn7.xirsys.com:3478?transport=tcp",
            "turns:eu-turn7.xirsys.com:443?transport=tcp",
            "turns:eu-turn7.xirsys.com:5349?transport=tcp",
          ],
        },
      ],
    },
  });

  //print peer id on connection "open" event.
  peer.on("open", (id) => {
    const mypeerIdEl = document.querySelector(".my-peer-id");
    mypeerIdEl.innerText = id;
  });

  peer.on("error", (errorMessage) => {});

  // On incoming connection.
  peer.on("connection", (connection) => {
    // Close existing connection and set new connection.

    dataConnection && dataConnection.close();
    dataConnection = connection;

    const event = new CustomEvent("peer-changed", { detail: connection.peer });
    document.dispatchEvent(event);
  });
  // Eventlistener  for incoming video call.
  peer.on("call", (incomingCall) => {
    mediaConnection && mediaConnection.close();

    // Change state on start/stop button.
    startVideoButtonEl.classList.remove("active");
    stopVideoButtonEl.classList.add("active");

    // Answer incoming call.
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((myStream) => {
        incomingCall.answer(myStream);
        mediaConnection = incomingCall;
        mediaConnection.on("stream", (theirStream) => {
          videoOfThemEl.muted = true;
          videoOfThemEl.srcObject = theirStream;
        });
      });
  });

  // Event listener for click "refresh list".
  listpeersButtonEl.addEventListener("click", () => {
    peer.listAllPeers((peers) => {
      const peersList = peers

        // Add filter for own peerId !!!
        .filter((peerId) => peerId !== peer._id)

        .map((peer) => {
          return `<li><button class= "connect-button peerId-${peer}" >${peer}</button></li>`;
        })
        .join("");
      peersEl.innerHTML = `<ul>${peersList}</ul>`;
    });
  });

  // Add Event listener for click peer button.
  peersEl.addEventListener("click", (event) => {
    //only works on click buttons.
    if (!event.target.classList.contains("connect-button")) return;

    let anotherPeerId = event.target.innerText;

    // Close existing connection.
    dataConnection && dataConnection.close();

    //connect to peer.
    dataConnection = peer.connect(anotherPeerId);

    dataConnection.on("open", () => {
      // Dispatch Custom Event with connected peer ID.
      const event = new CustomEvent("peer-changed", {
        detail: anotherPeerId,
      });
      document.dispatchEvent(event);
    });
  });

  // Add event Listener for custom event "peer-changed".
  document.addEventListener("peer-changed", (e) => {
    const peerId = e.detail;

    // Get clicked button.
    const connectButtonEl = document.querySelector(
      `.connect-button.peerId-${peerId}`
    );
    document.querySelectorAll(".connect-button.connected").forEach((button) => {
      button.classList.remove("connected");
    });

    // Add class "connected" to clicked button.
    connectButtonEl && connectButtonEl.classList.add("connected");

    dataConnection.on("data", (textMessage) => {
      printMessage(textMessage, "them");

      // Send focus on text input field
      newMessageEl.focus();
    });

    const theirVideoContainer = document.querySelector(".video-container.them");
    theirVideoContainer.querySelector(".name").innerText = peerId;
    theirVideoContainer.classList.add("connected");
    theirVideoContainer.querySelector(".start").classList.add("active");
    theirVideoContainer.querySelector(".stop").classList.remove("active");
  });

  // Send message to peer.
  //putting event listener on enter key on computer(no.13 = enter in javascript).
  const sendmessage = (e) => {
    if (!dataConnection) return;
    if (newMessageEl.value === "") return;
    if (e.type === "click" || e.keyCode === 13) {
      dataConnection.send(newMessageEl.value);
      printMessage(newMessageEl.value, "me");

      // Clear text input field.
      newMessageEl.value = "";
    }
    // Send focus on text input field.
    newMessageEl.focus();
  };
  // Event listeners for "send".
  sendButtonEl.addEventListener("click", sendmessage);
  newMessageEl.addEventListener("keyup", sendmessage);

  // Event listener for click "start video chat".
  const startVideoButton = theirVideoContainer.querySelector(".start");
  const stopVideoButton = theirVideoContainer.querySelector(".stop");

  startVideoButton.addEventListener("click", () => {
    startVideoButton.classList.remove("active");
    stopVideoButton.classList.add("active");

    // Start video call with remote peer.
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((myStream) => {
        mediaConnection && mediaConnection.close();
        console.log(dataConnection);
        const theirPeerId = dataConnection.peer;
        mediaConnection = peer.call(theirPeerId, myStream);
        mediaConnection.on("stream", (theirStream) => {
          videoOfThemEl.muted = true;
          videoOfThemEl.srcObject = theirStream;
        });
      });
  });

  // Event listener for click "Hang up"
  stopVideoButtonEl.addEventListener("click", () => {
    stopVideoButtonEl.classList.remove("active");
    startVideoButtonEl.classList.add("active");
    mediaConnection && mediaConnection.close();
  });
})();
