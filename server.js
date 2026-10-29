// Сервер для формы RSVP и уведомлений в Telegram.
// Требуется Node.js 18+. Токен храните только в переменных окружения, не в HTML.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ROOT = __dirname;
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};

function sendJson(res, code, data) {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'same-origin'});
  res.end(JSON.stringify(data));
}
async function notifyTelegram(name, attendance) {
  if (!BOT_TOKEN || !CHAT_ID) throw new Error('Telegram is not configured');
  const message = `🎉 Ответ на приглашение на крещение Тимофея\n\n👤 ${name}\n📩 Ответ: ${attendance}`;
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:CHAT_ID, text:message})
  });
  const body = await r.json();
  if (!r.ok || !body.ok) throw new Error('Telegram API error');
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/rsvp') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 10000) req.destroy(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(raw || '{}');
        const name = String(data.name || '').trim().replace(/[<>]/g, '');
        const attendance = String(data.attendance || '');
        if (!name || name.length > 100 || !['Буду','Не смогу прийти'].includes(attendance)) {
          return sendJson(res, 400, {error:'Проверьте имя и выбранный ответ.'});
        }
        await notifyTelegram(name, attendance);
        sendJson(res, 200, {ok:true});
      } catch (e) {
        console.error(e.message);
        sendJson(res, 500, {error:'Не удалось отправить ответ.'});
      }
    });
    return;
  }
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(ROOT, relative);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(file, (err, content) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {'Content-Type':MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'});
    res.end(content);
  });
});
server.listen(PORT, () => console.log(`Site running on http://localhost:${PORT}`));
