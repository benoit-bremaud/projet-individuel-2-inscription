const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // On n'utilise pas Cypress.env() : on desactive l'acces (defaut insecure de
  // Cypress 15, qui exposerait Cypress.env() au code du navigateur).
  allowCypressEnv: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
  },
});
