function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  res.status(status).json({
    error: err.expose ? err.message : 'Internal server error.'
  });
}

module.exports = errorHandler;
