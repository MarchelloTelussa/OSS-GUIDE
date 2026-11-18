// swagger.js
import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'QuantumGuide API Documentation',
    description: 'Dokumentasi API dan Endpoint Manajemen QuantumGuide',
    version: '1.0.0'
  },
  host: '100.78.105.90:3000', // Sesuaikan port server kamu
  schemes: ['http'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description: 'Masukkan token JWT dengan format: Bearer <token>'
    }
  }
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js', './routes/*.js'];

swaggerAutogen()(outputFile, endpointsFiles, doc);