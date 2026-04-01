const express = require('express');
const http    = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let state = { players: {}, markers: {} };

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}
function sendTo(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

wss.on('connection', (ws) => {
  sendTo(ws, { type: 'FULL_STATE', payload: state });
  ws.on('message', (raw) => {
    try { handle(ws, JSON.parse(raw.toString())); } catch(e) {}
  });
});

function handle(ws, msg) {
  const { type, payload } = msg;
  if (type === 'UPSERT_PLAYER') {
    const id = payload.id || uuidv4();
    state.players[id] = { ...state.players[id], ...payload, id, updatedAt: Date.now() };
    broadcast({ type: 'PLAYER_UPDATE', payload: state.players[id] });
  }
  if (type === 'REMOVE_PLAYER') {
    delete state.players[payload.id];
    broadcast({ type: 'PLAYER_REMOVED', payload: { id: payload.id } });
  }
  if (type === 'UPSERT_MARKER') {
    const id = payload.id || uuidv4();
    state.markers[id] = { ...payload, id, updatedAt: Date.now() };
    broadcast({ type: 'MARKER_UPDATE', payload: state.markers[id] });
  }
  if (type === 'REMOVE_MARKER') {
    delete state.markers[payload.id];
    broadcast({ type: 'MARKER_REMOVED', payload: { id: payload.id } });
  }
}

app.get('/api/state', (req, res) => res.json(state));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('\n  SCUM SQUAD MAP');
  console.log('  ────────────────────────────────');
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  Online: coloque seu IP ou domínio`);
  console.log('  ────────────────────────────────\n');
});
