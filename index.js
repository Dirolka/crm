const { createServer } = require('./server/app');

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = createServer();
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? 'Порт ' + port + ' уже занят. Укажите другой PORT.' : error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log('Orbit CRM: http://localhost:' + port));
}

module.exports = { createServer };
