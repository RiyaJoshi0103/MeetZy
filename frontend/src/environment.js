const IS_PROD = false; // local development mode

const server = IS_PROD
  ? "https://meetzy-backend1.onrender.com" // production URL
  : "http://localhost:8000"; // local server

export default server;
