require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

const default_routes = require('./routes/default.js');
const api_routes = require('./routes/api.js');
const telegram = require('./telegram/wrapper.js');

app.use(express.static(path.join(__dirname, 'src')));
app.use('/', default_routes);
app.use('/api/', api_routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// bot
telegram();