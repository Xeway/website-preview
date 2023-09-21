const puppeteer = require('puppeteer');
const PuppeteerScreenRecorder = require('puppeteer-screen-recorder').PuppeteerScreenRecorder;
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { exec } = require("child_process");

let ffmpegPath;

exec("which ffmpeg", (error, stdout, stderr) => {
  if (error) {
    throw new Error(error.message);
  }
  if (stderr) {
    throw new Error("FFmpeg doesn't seems to be installed. Please install it.");
  }
  ffmpegPath = stdout;
});

let config = {
  url: undefined,
  width: 1920,
  height: 1080,
  fps: 60,
  duration: 10,
  scroll: 0,
  scrollSpeed: 100, // default: scroll down 100px every frequency
  file: "website-preview.mp4"
}

const argv = yargs(hideBin(process.argv)).argv;
config = Object.assign({}, config, argv);

if (config.url === undefined) {
  throw new Error('Url not specified.');
}

const recorderConfig = {
  followNewTab: true,
  fps: config.fps,
  ffmpeg_Path: ffmpegPath,
  videoCrf: 18,
  videoCodec: 'libx264',
  videoPreset: 'ultrafast',
  videoBitrate: 1000,
  recordDurationLimit: config.duration
};

(async () => {
    const browser = await puppeteer.launch({ protocolTimeout: 5*60*1000 }); // set 5 minutes timeout
    const page = await browser.newPage();
    const recorder = new PuppeteerScreenRecorder(page, recorderConfig);

    await page.setViewport({width: config.width, height: config.height});

    await page.goto(config.url);
    await recorder.start(config.file);

    await autoScroll(page);

    // sleep
    await new Promise(r => setTimeout(r, config.duration*1000));

    await recorder.stop();
    await browser.close();
})();


async function autoScroll(page) {
  await page.evaluate(async (config) => {
    const scrollHeight = document.body.scrollHeight * config.scroll;
    const distance = config.scrollSpeed;
    const frequency = ((config.duration*1000)*distance) / scrollHeight;

    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      let timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, frequency);
    });
  }, config);
}
