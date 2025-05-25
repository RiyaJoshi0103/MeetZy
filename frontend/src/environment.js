const IS_PROD = false; // local development mode

const server = IS_PROD
  ? "https://meetzybackend-ku9e.onrender.com" // production URL
  : "http://localhost:8000"; // local server

export default server;
