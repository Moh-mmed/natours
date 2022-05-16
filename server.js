const dotenv = require('dotenv');
const mongoose = require('mongoose');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION!');
  console.log(err.name, err.message);
  process.exit(1);
  //! WE NEED LATER IN THE HOSTING RESTART THE PROCESS (which many platforms do automatically)
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// Connecting To The DB
mongoose.connect(DB).then(() => {
  console.log('DB Connected Successfully!');
});

// Listening to the server
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log('Listening on port 8080');
});

process.on('unhandledRejection', (err) => {
  console.log('UNCAUGHT REJECTION!');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
    //! WE NEED LATER IN THE HOSTING RESTART THE PROCESS (which many platforms do automatically)
  });
});
