try {
  const app = require('../server.js');
  module.exports = (req, res) => {
    try {
      return app(req, res);
    } catch (err) {
      console.error('Runtime Error:', err);
      res.status(500).json({ error: 'Runtime Error', message: err.message, stack: err.stack });
    }
  };
} catch (err) {
  console.error('Initialization Error:', err);
  module.exports = (req, res) => {
    res.status(500).json({ error: 'Initialization Error', message: err.message, stack: err.stack });
  };
}
