const WebSocket = require('ws');

const socket = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

const symbols = [
  'R_10', 'R_25', 'R_50', 'R_75', 'R_100',
  '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V',
  'BOOM300', 'BOOM500', 'BOOM1000',
  'CRASH300', 'CRASH500', 'CRASH1000',
  'STP', 'JD10', 'JD25', 'JD50', 'JD75', 'JD100',
  'frxEURUSD', 'frxGBPUSD', 'frxUSDJPY', 'frxAUDUSD', 'frxUSDCAD'
];

const prices = {};
const invalid = [];

socket.on('open', () => {
  console.log('Connected!');
  symbols.forEach(s => {
    socket.send(JSON.stringify({ ticks: s, subscribe: 1 }));
  });
});

socket.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.msg_type === 'tick' && msg.tick) {
    prices[msg.tick.symbol] = msg.tick.quote;
  } else if (msg.error) {
    invalid.push({ symbol: msg.echo_req.ticks, error: msg.error.message });
  }
});

setTimeout(() => {
  console.log('\n--- VALID SYMBOLS AND LATEST PRICES ---');
  console.log(JSON.stringify(prices, null, 2));
  console.log('\n--- INVALID SYMBOLS ---');
  console.log(JSON.stringify(invalid, null, 2));
  socket.close();
  process.exit(0);
}, 6000);
