import {
  html,
  render,
} from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

const borderColor = "#777";
const buttonStyle = "border border-blue-400 py-1 px-2 rounded-md";
const numberInputStyle = `bg-transparent outline-none border border-[${borderColor}] rounded-md pl-2`;

const newDuckTime = (stream) => {
  const duckTimeTemplate = html`<div class="w-full flex gap-2 items-center">
    <span class="text-sm">Duck at minute</span>
    <input
      id="minute"
      type="number"
      class="${numberInputStyle}"
      min="0"
      max="59"
      value="0"
    />
    <span class="text-sm">for</span>
    <input
      id="duration"
      type="number"
      class="${numberInputStyle}"
      min="0"
      max="59"
      value="5"
    />
    <span class="text-sm">minutes</span>
    <button id="delete" class="ml-auto ${buttonStyle}">-</button>
  </div>`;

  const duckTime = dom(duckTimeTemplate);
  duckTime.querySelector("#delete").addEventListener("click", () => {
    stream.removeDuckTime(duckTime);
  });

  const minute = duckTime.querySelector("#minute");
  const duration = duckTime.querySelector("#duration");
  minute.addEventListener("change", () => stream.updateDuckTimes());
  duration.addEventListener("change", () => stream.updateDuckTimes());
  duckTime.getTime = () => {
    return {
      minute: parseInt(minute.value),
      duration: parseInt(duration.value),
    };
  };
  duckTime.setTime = (time) => {
    minute.value = time.minute;
    duration.value = time.duration;
  };
  return duckTime;
};

const dom = (html) => {
  const div = document.createElement("div");
  render(html, div);
  return div.children[0];
};

const newStream = () => {
  const streamTemplate = html`<div class="w-full flex flex-col gap-4">
    <div class="flex flex-col gap-2 p-4 border border-[${borderColor}] rounded">
      <span class="font-semibold text-white">Main Stream URL</span>
      <input
        id="url"
        class="w-full bg-transparent outline-none border border-[${borderColor}] py-1 px-2 rounded-md"
        value="https://edge66.streamonkey.net/radio886-onair/stream/mp3"
      />
      <span class="font-semibold text-white">Ducked Stream URL</span
      ><span class="text-xs text-[#aaa] -mt-2"
        >*optional, used when main stream is ducked</span
      >
      <input
        id="altUrl"
        class="w-full bg-transparent outline-none border border-[${borderColor}] py-1 px-2 rounded-md"
        value="https://orf-live.ors-shoutcast.at/fm4-q2a"
      />
    </div>
    <div class="flex flex-col gap-2 p-4 border border-[${borderColor}] rounded">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-white">Duck times</span>
        <button id="addDuckTime" class="ml-auto ${buttonStyle}">Add</button>
      </div>
      <div class="text-sm text-[#aaa]">
        Set one or more duck times to duck the main stream, e.g. when news is
        playing at the 0th minute for 5 minutes, every hour.
      </div>
      <div class="border-b border-[${borderColor}]"></div>
      <div id="duckTimes" class="flex flex-col gap-2"></div>
    </div>
    <div class="flex items-center gap-2">
      <button id="play" class="py-2 px-4 border border-blue-400 rounded-md">
        Play
      </button>
      <span>Volume</span>
      <button id="volumeDown" class="${buttonStyle} px-4">-</button>
      <span id="volume" class="min-w-[30px] max-w-[30px] text-center">100</span>
      <button id="volumeUp" class="${buttonStyle} px-4">+</button>
      <span id="duck" class="text-xl" style="display:none">🐤</span>
    </div>
    <audio id="audio"></audio>
    <audio id="altAudio"></audio>
  </div>`;

  const stream = dom(streamTemplate);
  const duckling = stream.querySelector("#duck");
  let isDucked = false;
  let duckIntervals = [];
  let duckTimeouts = [];
  const clearTimers = () => {
    duckIntervals.forEach((intervalId) => clearInterval(intervalId));
    duckIntervals = [];
    duckTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    duckTimeouts = [];
    audio.volume = parseInt(volume.innerText) / 100;
    altAudio.volume = 0;
    duckling.style.display = "none";
  };

  stream.updateDuckTimes = () => {
    clearTimers();
    save();

    const duckTimes = stream.querySelector("#duckTimes").children;
    if (duckTimes.length == 0) {
      console.log("No duck times");
      return;
    }

    Array.from(duckTimes).forEach((duckTime) => {
      const time = duckTime.getTime();
      const now = new Date();
      let waitTime = time.minute - now.getMinutes();
      if (waitTime < 0) waitTime += 60;
      waitTime =
        waitTime * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();

      const duck = () => {
        audio.volume = 0;
        altAudio.volume = parseInt(volume.innerText) / 100;
        if (isPlaying) altAudio.play();
        console.log("ducked");
        duckling.style.display = "";
        isDucked = true;
      };

      const unduck = () => {
        audio.volume = parseInt(volume.innerText) / 100;
        altAudio.volume = 0;
        if (isPlaying) audio.play();
        console.log("unducked");
        duckling.style.display = "none";
        isDucked = false;
      };

      const waitTimer = setTimeout(() => {
        duck();
        duckTimeouts.push(
          setTimeout(
            unduck,
            time.duration * 60 * 1000 + (waitTime < 0 ? waitTime : 0)
          )
        );
        duckIntervals.push(setInterval(duck, 60 * 60 * 1000));
        duckIntervals.push(
          setInterval(unduck, 60 * 60 * 1000 + time.duration * 60 * 1000)
        );
      }, waitTime);

      duckTimeouts.push(waitTimer);
    });
    console.log("Updated timers");
  };

  stream.addDuckTime = (duckTime) => {
    stream.querySelector("#duckTimes").append(duckTime);
    stream.updateDuckTimes();
  };

  stream.removeDuckTime = (duckTime) => {
    duckTime.remove();
    stream.updateDuckTimes();
  };

  const url = stream.querySelector("#url");
  const altUrl = stream.querySelector("#altUrl");
  const audio = stream.querySelector("#audio");
  const altAudio = stream.querySelector("#altAudio");
  const play = stream.querySelector("#play");
  const volume = stream.querySelector("#volume");
  const volumeUp = stream.querySelector("#volumeUp");
  const volumeDown = stream.querySelector("#volumeDown");
  let isPlaying = false;

  const start = () => {
    audio.src = url.value;
    audio.play();
    audio.volume = parseInt(volume.innerText) / 100;
    altAudio.src = altUrl.value;
    audio.play();
    audio.volume = 0;

    isPlaying = true;
    play.innerText = "Stop";
    stream.updateDuckTimes();
  };

  const stop = () => {
    audio.src = "";
    altAudio.src = "";
    isPlaying = false;
    play.innerText = "Play";
  };

  url.addEventListener("input", () => {
    audio.src = "";
    altAudio.src = "";
    isPlaying = false;
    play.innerText = "Play";
    save();
  });

  altUrl.addEventListener("input", () => {
    audio.src = "";
    altAudio.src = "";
    isPlaying = false;
    play.innerText = "Play";
    save();
  });

  play.addEventListener("click", () => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  });

  volumeUp.addEventListener("click", () => {
    const vol = Math.min(parseInt(volume.innerText) / 100 + 0.1, 1);
    if (!isDucked) audio.volume = vol;
    else altAudio.volume = vol;
    volume.innerText = (vol * 100).toFixed(0);
    save();
  });

  volumeDown.addEventListener("click", () => {
    const vol = Math.max(parseInt(volume.innerText) / 100 - 0.1, 0);
    if (!isDucked) audio.volume = vol;
    else altAudio.volume = vol;
    volume.innerText = (vol * 100).toFixed(0);
    save();
  });

  stream
    .querySelector("#addDuckTime")
    .addEventListener("click", () => stream.addDuckTime(newDuckTime(stream)));

  const save = () => {
    localStorage.setItem(
      "config",
      JSON.stringify({
        url: url.value,
        altUrl: altUrl.value,
        duckTimes: Array.from(stream.querySelector("#duckTimes").children).map(
          (duckTime) => duckTime.getTime()
        ),
      })
    );
  };

  const config = JSON.parse(localStorage.getItem("config"));
  if (config) {
    url.value = config.url;
    altUrl.value = config.altUrl;
    for (const duckTime of config.duckTimes) {
      const dt = newDuckTime(stream);
      dt.setTime(duckTime);
      stream.addDuckTime(dt);
    }
  } else {
    const duckTime = newDuckTime(stream);
    duckTime.setTime({ minute: 50, duration: 1 });
    stream.addDuckTime(duckTime);
  }

  return stream;
};

document.querySelector("#streams").append(newStream());
