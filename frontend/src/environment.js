const IS_PROD = import.meta.env.MODE === "production";

const server = IS_PROD
  ? "https://meetzy-backend1.onrender.com" // production URL
  : "http://localhost:8000"; // local development

export default server;
