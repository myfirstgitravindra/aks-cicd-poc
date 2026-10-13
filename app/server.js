const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send(`Hello from AKS POC! Version: ${process.env.APP_VERSION || "dev"}`);
});

app.get("/health", (req, res) => res.status(200).send("ok"));

app.listen(3000, () => console.log("Listening on 3000"));
