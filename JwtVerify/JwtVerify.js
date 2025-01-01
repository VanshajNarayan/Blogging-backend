const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const jwtVerify = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token === null) {
    return res.status(401).json({ error: "No access token" });
  }

  jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = user.id;
    next();
  });
};

module.exports = { jwtVerify };
