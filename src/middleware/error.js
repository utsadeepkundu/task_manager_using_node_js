exports.notFound = (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
};

exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: 'Email already registered' });
  res.status(500).json({ message: 'Server error' });
};