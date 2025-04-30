const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('./src/index');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let blueScore = 0;
let redScore = 0;

const tiktokUsername = 'vonxclem';

const tiktok = new WebcastPushConnection(tiktokUsername, {
  enableExtendedGiftInfo: true
});

tiktok.connect().then(() => {
  console.log(`Connecté au live de @${tiktokUsername}`);
}).catch(err => {
  console.error('Erreur de connexion TikTok :', err);
});

tiktok.on('gift', (data) => {
  const giftName = data.extendedGiftInfo?.name?.toLowerCase() || '';

  if (giftName.includes('rose')) {
    blueScore++;
  } else if (giftName.includes('heart') || giftName.includes('heart me')) {
    redScore++;
  }

  io.emit('update', { blue: blueScore, red: redScore });
});

app.use(express.static('public'));

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Serveur web en ligne sur le port ${port}`);
});
