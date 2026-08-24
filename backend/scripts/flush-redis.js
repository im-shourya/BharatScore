const Redis = require('ioredis');

const redis = new Redis({
  host: "literate-bat-80992.upstash.io",
  port: 6379,
  password: "gQAAAAAAATxgAAIgcDJiMGFlMmJkOGJiODM0ODNmYjNjMjhmNDFiYzVlYWQ4Yg",
  tls: {}
});

async function run() {
  try {
    console.log("Connecting to Upstash Redis...");
    await redis.ping();
    console.log("Connected! Flushing all data...");
    await redis.flushall();
    console.log("✅ Redis flushed successfully! Storage should now be freed up.");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
