const playlistFile = document.getElementById("playlistFile");
const channelList = document.getElementById("channelList");
const statusText = document.getElementById("status");

playlistFile.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  statusText.textContent = `${file.name} 불러오는 중...`;

  try {
    const text = await file.text();
    const channels = parseM3U(text);

    channelList.innerHTML = "";

    if (!channels.length) {
      statusText.textContent = "채널을 찾지 못했습니다.";
      return;
    }

    channels.forEach((channel, index) => {
      const li = document.createElement("li");
      li.textContent = `${index + 1}. ${channel.name}`;
      channelList.appendChild(li);
    });

    statusText.textContent = `${channels.length}개 채널을 불러왔습니다.`;
  } catch (error) {
    console.error(error);
    statusText.textContent = "파일을 읽는 중 오류가 발생했습니다.";
  }
});

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const channels = [];
  let currentName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXTINF")) {
      const parts = line.split(",");
      currentName = parts[parts.length - 1]?.trim() || "이름 없는 채널";
    } else if (line && !line.startsWith("#")) {
      channels.push({
        name: currentName || "이름 없는 채널",
        url: line
      });
      currentName = "";
    }
  }

  return channels;
}
