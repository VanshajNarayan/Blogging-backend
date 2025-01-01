const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./Db/Db");
const router = require("./routes/Router");
const aws = require("aws-sdk");

// configure the server:-
dotenv.config();

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));

app.use(express.json());

// routing the app:-
app.use("/api", router);

const s3 = new aws.S3({
  region: "eu-north-1",
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const GenerateUploadUrl = async () => {
  const date = new Date();
  const imageName = `${date.getTime()}.jpeg`;

  return await s3.getSignedUrlPromise("putObject", {
    Bucket: "vanshaj-blogging-website",
    Key: imageName,
    Expires: 1000,
    ContentType: "image/jpeg",
  });
};

app.get("/get-upload-url", async (req, res) => {
  try {
    const url = await GenerateUploadUrl();
    if (url) {
      return res.status(200).json({ success: "true", message: url });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// listen to the port:-
let PORT = "3000";
app.listen(PORT, () => {
  // connect to the database:-
  connectDB();
  console.log("Server is running on port " + PORT + " " + "✈️");
});

// blogging123;
