const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());

// Раздача статики (фронта)
app.use('/', express.static(path.join(__dirname, 'satisfactory-calculator')));

const DATA_FILE = 'data.json';

// Получить все данные
app.get('/data', (req, res) => {
  fs.readFile(DATA_FILE, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return res.json({});
      return res.status(500).json({error: 'Read error'});
    }
    res.json(JSON.parse(data));
  });
});

// Сохранить все данные
app.post('/data', (req, res) => {
  fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), err => {
    if (err) return res.status(500).json({error: 'Write error'});
    res.json({status: 'ok'});
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Server started on port ' + PORT));