const opsAuth = (req, res, next) => {
  const token = req.headers["x-ops-token"];
  if (!token || token !== process.env.OPS_TOKEN) {
    return res.status(401).json({ error: "Unauthorized ops access" });
  }
  next();
};

module.exports = { opsAuth };
