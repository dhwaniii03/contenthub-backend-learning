import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stefan Content Hub API',
      version: '1.0.0',
      description: 'API documentation for the Stefan Content Hub Backend',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/**/*.js', './modules/**/*.js'], // Paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      swaggerOptions: {
        withCredentials: true,
      },
    })
  );
  console.log("📖 Swagger docs available at http://localhost:5000/api-docs");
};

export default setupSwagger;
