const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const logger = require('./config/logger');
const { server } = require('./src/app');

const port = process.env.PORT;

server.listen(port, () => {
  logger.info(`Backend server running on port ${port} in ${process.env.NODE_ENV} mode`);
});
