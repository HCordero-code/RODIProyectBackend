import { config } from "dotenv";
config();

import { connect } from "./config/mongo.js";
import { initAdmin } from "./config/init.configs.js";
import app from "./config/app.js";

await connect();
await initAdmin();

export default app;