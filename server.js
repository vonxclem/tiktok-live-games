const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('./src/index');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let blueScore = 28;
let redScore = 31;
let likeCount = 0;

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
    
  if (giftName.includes('rose')) {
    blueScore++;
  } else if (giftName.includes('heart') || giftName.includes('heart me')) {
    redScore++;
  }

  io.emit('update', { blue: blueScore, red: redScore });
});

tiktok.on('like', (data) => {
  likeCount += data.likeCount || 1;
  console.log(`Like reçu ! Total : ${likeCount}`);

  io.emit('likes', { likes: likeCount });
});

app.use(express.static('public'));

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Web server: ${port}`);
});
