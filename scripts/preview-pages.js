import express from "express";
const app = express();
const base = process.env.BASE_PATH || "/xrp-studio/";
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});
app.get("/", (req, res) => res.redirect(base));
app.use(base, express.static("dist"));
app.listen(4174, "127.0.0.1", () =>
  console.log(`Pages preview: http://localhost:4174${base}`),
);
