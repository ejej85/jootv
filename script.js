const playlistFile = document.getElementById("playlistFile");
const channelList = document.getElementById("channelList");
const statusText = document.getElementById("status");
const nowPlaying = document.getElementById("nowPlaying");
const video = document.getElementById("video");

let channels = [];
let currentIndex = -1;
let hls = null;

playlistFile.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  statusText.textContent = `${file.name} 불러오는 중...`;

  try {
    const text = await file.text();
    channels = parseM3U(text);

    channelList.innerHTML = "";

    if (!channels.length) {
      statusText.textContent = "채널을 찾지 못했습니다.";
      nowPlaying.textContent = "재생할 채널을 선택하세요";
      return;
    }

    renderChannelList();
    statusText.textContent = `${channels.length}개 채널을 불러왔습니다.`;
    nowPlaying.textContent = "채널을 선택하세요";
  } catch (error) {
    console.error(error);
    statusText.textContent = "파일을 읽는 중 오류가 발생했습니다.";
  }
});

function renderChannelList() {
  channelList.innerHTML = "";

  channels.forEach((channel, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${channel.name}`;
    li.addEventListener("click", () => {
      playChannel(index);
    });

    if (index === currentIndex) {
      li.classList.add("active");
    }

    channelList.appendChild(li);
  });
}

function playChannel(index) {
  const channel = channels[index];
  if (!channel) return;

  currentIndex = index;
  renderChannelList();

  nowPlaying.textContent = channel.name;
  statusText.textContent = channel.url;

  if (hls) {
    hls.destroy();
    hls = null;
  }

  const nativeHls = video.canPlayType("application/vnd.apple.mpegurl");

  if (nativeHls) {
    video.src = channel.url;
    video.play().catch((err) => {
      console.warn("자동재생 실패:", err);
    });
    return;
  }

  if (window.Hls && Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(channel.url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch((err) => {
        console.warn("자동재생 실패:", err);
      });
    });
    return;
  }

  statusText.textContent = "이 브라우저는 HLS 재생을 지원하지 않습니다.";
}

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let currentName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const parts = line.split(",");
      currentName = parts[parts.length - 1]?.trim() || "이름 없는 채널";
    } else if (!line.startsWith("#")) {
      result.push({
        name: currentName || "이름 없는 채널",
        url: line
      });
      currentName = "";
    }
  }

  return result;
}
