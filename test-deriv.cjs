const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ ohlc: 'CRASH500', subscribe: 1, granularity: 2592000 }));
  ws.send(JSON.stringify({
    ticks_history: 'CRASH500',
    adjust_start_time: 1,
    count: 500,
    end: 'latest',
    granularity: 60,
    style: 'candles',
    req_id: 1
  }));
});
ws.on('message', (data) => {
  console.log(data.toString());
});
