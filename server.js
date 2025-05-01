const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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
  enableExtendedGiftInfo: true
});

async function connectToTikTok() {
  try {
    await tiktok.connect();
    console.log(`Connected to @${tiktokUsername} !`);
  } catch (err) {
    console.error('Connection error:', err.message);
    setTimeout(connectToTikTok, 10000); 
  }
}

connectToTikTok();

tiktok.on('gift', (data) => {
  const giftName = data.extendedGiftInfo?.name?.toLowerCase() || '';
  console.log(`Gift : ${giftName}`);
  const senderId = data.uniqueId;
  const senderName = data.nickname || senderId;
  const senderProfile = data.profilePictureUrl;
    
  if (giftName.includes('rose')) {
    blueScore++;
  } else if (giftName.includes('heart') || giftName.includes('heart me')) {
    redScore++;
  }

  if (!topDonors[senderId]) {
    topDonors[senderId] = {
      name: senderName,
      profile: senderProfile,
      count: 1
    };
  } else {
    topDonors[senderId].count += 1;
  }

  const best = Object.values(topDonors).sort((a, b) => b.count - a.count)[0];

  io.emit('update', { blue: blueScore, red: redScore });
  io.emit('topDonor', best); 
});

tiktok.on('like', (data) => {
  likeCount += data.likeCount || 1;
  console.log(`Total likes: ${likeCount}`);

  io.emit('likes', { likes: likeCount });
});

app.use(express.static('public'));

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Web server: ${port}`);
});
