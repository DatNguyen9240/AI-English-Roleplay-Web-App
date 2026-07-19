// MUST be first — registers all path aliases from _moduleAliases in package.json
// before any other require() call resolves internal modules.
require('module-alias/register');

const path = require('path');
const dotenv = require('dotenv');

// Local backend overrides take priority, while normal `npm run dev` can use
// the repository-level .env shared by Docker and the frontend configuration.
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const logger = require('@config/logger');
const { server } = require('./src/app');

const port = process.env.PORT;

server.listen(port, () => {
  logger.info(`Backend server running on port ${port} in ${process.env.NODE_ENV} mode`);
});
