const mongoose = require('mongoose');
const conectarDB = () => {

const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI) 
   .then(() => { console.log('conexion exitosa')
})
   .catch((error) => {
    console.error('error al conectar a mongoDB:', error);
    process.exit(1); 
   });
};
module.exports = conectarDB 
