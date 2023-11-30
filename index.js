const { request } = require("express");
const express = require("express");
const client = require("prom-client");
const responseTime = require("response-time");

const app = express();
const port = 8000;

// Prometheus metrics setup
const collectionDefaultMetrics = client.collectDefaultMetrics;
collectionDefaultMetrics({ register: client.register });

const resTime = new client.Histogram({
  name: "http_express_req_res_time",
  help: "cal time for api call",
  labelNames: ["method", "route", "status_code"],
  buckets: [1, 20, 50, 100, 200, 300, 600, 700, 800, 900, 1000, 1500, 2000],
});

app.use(
  responseTime((req, res, time) => {
    resTime
      .labels({
        method: req.method,
        route: req.url,
        status_code: res.statusCode,
      })
      .observe(time);
  })
);

app.get("/", (req, res) => {
  res.json({ message: "Hello, this is a normal route!" });
});
app.get("/count", (req, res) => {
  let x = 90000;
  for (i = 0; i < x; i++) {
    console.log("yo");
  }
  res.json({ message: "Hello, this is a normal route!" });
});

app.get("/delayed", async (req, res) => {
  const start = new Date();

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const end = new Date();
  const responseTime = end - start;

  if (Math.random() < 0.25) {
    res.status(500).json({ error: "Internal Server Error" });
  } else {
    res.json({
      message: "Delayed response!",
      responseTime: `${responseTime}ms`,
    });
  }
});

// Metrics endpoint for Prometheus
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
