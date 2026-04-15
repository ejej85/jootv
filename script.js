const playlistFile = document.getElementById("playlistFile");
const channelList = document.getElementById("channelList");
const statusText = document.getElementById("status");
const nowPlaying = document.getElementById("nowPlaying");
const video = document.getElementById("video");

const fullscreenBtn = document.getElementById("fullscreenBtn");
const toggleListBtn = document.getElementById("toggleListBtn");
const playerWrap = document.getElementById("playerWrap");
const listWrap = document.querySelector(".list-wrap");

let channels = [];
let currentIndex = -1;
let hls = null;

init();

function init() {
  bindEvents();
  handleOrientationChange();
}

function bindEvents() {
  playlistFile.addEventListener("change", handlePlaylistFileChange);

  fullscreenBtn.addEventListener("click", async () => {
    await enterFullscreen();
  });

  toggleListBtn.addEventListener("click", () => {
    listWrap.classList.toggle("show");
  });

  window.addEventListener("orientationchange", handleOrientationChange);
  window.addEventListener("resize", handleOrientationChange);

  document.addEventListener("fullscreenchange", syncFullscreenButtonText);

  video.addEventListener("error", () => {
    statusText.textContent = "영상 재생 중 오류가 발생했습니다.";
  });

  video.addEventListener("loadedmetadata", () => {
    statusText.textContent = "재생 준비가 완료되었습니다.";
  });

  video.addEventListener("playing", () => {
    statusText.textContent = "재생 중";
  });

  video.addEventListener("waiting", () => {
    statusText.textContent = "불러오는 중...";
  });
}

async function handlePlaylistFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  statusText.textContent = `${file.name} 불러오는 중...`;

  try {
    const text = await file.text();
    channels = parseM3U(text);
    currentIndex = -1;

    if (!channels.length) {
      channelList.innerHTML = "";
      nowPlaying.textContent = "재생할 채널을 선택하세요";
      statusText.textContent = "채널을 찾지 못했습니다.";
      return;
    }

    renderChannelList();
    nowPlaying.textContent = "채널을 선택하세요";
    statusText.textContent = `${channels.length}개 채널을 불러왔습니다.`;
  } catch (error) {
    console.error(error);
    statusText.textContent = "파일을 읽는 중 오류가 발생했습니다.";
  }
}

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const result = [];

  let currentChannel = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const name = extractChannelName(line);
      const tvgLogo = extractAttribute(line, "tvg-logo");
      const groupTitle = extractAttribute(line, "group-title");

      currentChannel = {
        name: name || "이름 없는 채널",
        logo: tvgLogo || "",
        group: groupTitle || "",
        url: ""
      };
      continue;
    }

    if (!line.startsWith("#")) {
      if (currentChannel) {
        currentChannel.url = line;
        result.push(currentChannel);
        currentChannel = null;
      } else {
        result.push({
          name: "이름 없는 채널",
          logo: "",
          group: "",
          url: line
        });
      }
    }
  }

  return result;
}

function extractChannelName(extinfLine) {
  const commaIndex = extinfLine.lastIndexOf(",");
  if (commaIndex === -1) return "이름 없는 채널";
  return extinfLine.slice(commaIndex + 1).trim();
}

function extractAttribute(line, attrName) {
  const regex = new RegExp(`${attrName}="([^"]*)"`, "i");
  const match = line.match(regex);
  return match ? match[1] : "";
}

function renderChannelList() {
  channelList.innerHTML = "";

  channels.forEach((channel, index) => {
    const li = document.createElement("li");
    li.className = index === currentIndex ? "active" : "";

    const nameEl = document.createElement("div");
    nameEl.textContent = `${index + 1}. ${channel.name}`;

    li.appendChild(nameEl);

    if (channel.group) {
      const groupEl = document.createElement("small");
      groupEl.textContent = channel.group;
      groupEl.style.display = "block";
      groupEl.style.marginTop = "4px";
      groupEl.style.color = "#9aa0a6";
      li.appendChild(groupEl);
    }

    li.addEventListener("click", () => {
      playChannel(index);
    });

    channelList.appendChild(li);
  });
}

function playChannel(index) {
  const channel = channels[index];
  if (!channel) return;

  currentIndex = index;
  renderChannelList();

  nowPlaying.textContent = channel.name;
  statusText.textContent = "채널 연결 중...";

  destroyHlsInstance();
  resetVideoSource();

  const url = channel.url;
  const canPlayNativeHls = !!video.canPlayType("application/vnd.apple.mpegurl");

  if (canPlayNativeHls) {
    video.src = url;
    attemptPlay();
  } else if (window.Hls && Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      attemptPlay();
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error("HLS error:", data);
      statusText.textContent = "스트림을 불러오지 못했습니다.";
    });
  } else {
    statusText.textContent = "이 브라우저는 HLS 재생을 지원하지 않습니다.";
    return;
  }

  if (window.innerWidth > window.innerHeight) {
    listWrap.classList.remove("show");
  }
}

function attemptPlay() {
  const playPromise = video.play();

  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch((err) => {
      console.warn("재생 시작 실패:", err);
      statusText.textContent = "재생 버튼을 눌러주세요.";
    });
  }
}

function destroyHlsInstance() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function resetVideoSource() {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

async function handleOrientationChange() {
  const isLandscape = window.innerWidth > window.innerHeight;

  if (isLandscape) {
    try {
      await enterFullscreen();

      if (screen.orientation && typeof screen.orientation.lock === "function") {
        try {
          await screen.orientation.lock("landscape");
        } catch (err) {
          console.log("화면 방향 고정 미지원:", err);
        }
      }
    } catch (err) {
      console.log("자동 전체화면 실패:", err);
    }
  } else {
    listWrap.classList.remove("show");

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.log("전체화면 종료 실패:", err);
      }
    }
  }

  syncFullscreenButtonText();
}

async function enterFullscreen() {
  if (document.fullscreenElement) return;

  if (playerWrap.requestFullscreen) {
    return playerWrap.requestFullscreen();
  }

  if (playerWrap.webkitRequestFullscreen) {
    return playerWrap.webkitRequestFullscreen();
  }

  if (video.webkitEnterFullscreen) {
    return video.webkitEnterFullscreen();
  }
}

function syncFullscreenButtonText() {
  const isFullscreen = !!document.fullscreenElement;
  fullscreenBtn.textContent = isFullscreen ? "전체화면 종료" : "전체화면";
}

fullscreenBtn.addEventListener("click", async () => {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (err) {
      console.log("전체화면 종료 실패:", err);
    }
    return;
  }

  await enterFullscreen();
});
