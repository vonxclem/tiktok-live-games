const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fetch = require('node-fetch');
const { WebcastPushConnection } = require('./src/index');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let blueScore = 28;
let redScore = 28;
let likeCount = 0;
const topDonors = {};

const tiktokUsername = 'vonxclem';
const tiktok = new WebcastPushConnection(tiktokUsername, {
  enableExtendedGiftInfo: true,
});

let lastGiftTime = Date.now();
let lastLikeTime = Date.now();

// Connect to TikTok live
async function connectToTikTok() {
  try {
    await tiktok.connect();
    console.log(`Connected to @${tiktokUsername}`);
  } catch (err) {
    console.error('Connection error:', err.message);
    setTimeout(connectToTikTok, 10000);
  }
}

connectToTikTok();

// GIFT event
tiktok.on('gift', (data) => {
  lastGiftTime = Date.now();

  const giftName = data.extendedGiftInfo?.name?.toLowerCase() || '';
  const senderId = data.uniqueId;
  const senderName = data.nickname || senderId;
  const senderProfile = data.profilePictureUrl;

  console.log('Gift received:', giftName);

  if (giftName.includes('rose')) {
    blueScore++;
  } else if (giftName.includes('heart') || giftName.includes('heart me')) {
    redScore++;
  }

  if (!topDonors[senderId]) {
    topDonors[senderId] = { name: senderName, profile: senderProfile, count: 1 };
  } else {
    topDonors[senderId].count += 1;
  }

  const best = Object.values(topDonors).sort((a, b) => b.count - a.count)[0];

  io.emit('update', { blue: blueScore, red: redScore });
  io.emit('topDonor', best);
});

// LIKE event
tiktok.on('like', (data) => {
  lastLikeTime = Date.now();
  likeCount += data.likeCount || 1;
  console.log('Like received, total:', likeCount);
  io.emit('likes', { likes: likeCount });
});

// End of live event
tiktok.on('streamEnd', () => {
  console.log('Live has ended. Resetting scores.');
  blueScore = 0;
  redScore = 0;
  likeCount = 0;
  for (const id in topDonors) delete topDonors[id];
  io.emit('update', { blue: 0, red: 0 });
  io.emit('likes', { likes: 0 });
  io.emit('topDonor', null);
});

// WebSocket events
tiktok.on('connected', () => console.log('WebSocket connected'));
tiktok.on('disconnected', () => console.log('WebSocket disconnected'));
tiktok.on('error', (err) => console.error('TikTok error:', err));

// Inactivity reconnection watchdog
setInterval(() => {
  const now = Date.now();
  const noActivity = now - lastGiftTime > 120000 && now - lastLikeTime > 120000;

  if (noActivity) {
    console.log('No activity detected. Reconnecting...');
    tiktok.disconnect();
    connectToTikTok();
  }
}, 30000);

// Keep-alive ping to prevent Render from sleeping
setInterval(() => {
  fetch(`https://${process.env.RENDER_EXTERNAL_URL || 'localhost'}/`).catch(() => {});
}, 60000);

app.use(express.static('public'));

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Web server is running on port ${port}`);
});
