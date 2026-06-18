describe('Parcours inscription (API mockee)', () => {
  // Glob qui matche l'endpoint /users de l'API tierce (jsonplaceholder),
  // quelle que soit l'origine. cy.intercept court-circuite le vrai reseau.
  const USERS = '**/users';

  function fillValidForm() {
    cy.get('#nom').type('Bremaud');
    cy.get('#prenom').type('Benoit');
    cy.get('#email').type('benoit@example.com');
    cy.get('#dateNaissance').type('1990-01-01');
    cy.get('#ville').type('Paris');
    cy.get('#codePostal').type('75001');
  }

  it("affiche le nombre d'inscrits renvoye par l'API", () => {
    cy.intercept('GET', USERS, { statusCode: 200, body: [{ id: 1 }, { id: 2 }] }).as('getUsers');
    cy.visit('/');

    cy.wait('@getUsers');
    cy.contains('2 inscrit(s)');
  });

  it('inscrit un nouvel utilisateur quand le formulaire est valide', () => {
    cy.intercept('GET', USERS, { statusCode: 200, body: [] }).as('getUsers');
    cy.intercept('POST', USERS, { statusCode: 201, body: { id: 11 } }).as('createUser');
    cy.visit('/');
    cy.wait('@getUsers');
    cy.contains('0 inscrit(s)');

    fillValidForm();
    cy.contains("S'inscrire").click();

    cy.wait('@createUser');
    cy.get('.toast').contains('Inscription réussie !');
    cy.contains('1 inscrit(s)');
  });

  it("n'inscrit personne quand le formulaire contient une erreur", () => {
    cy.intercept('GET', USERS, { statusCode: 200, body: [{ id: 1 }] }).as('getUsers');
    cy.visit('/');
    cy.wait('@getUsers');
    cy.contains('1 inscrit(s)');

    // Tous les champs remplis (bouton actif) mais code postal invalide.
    fillValidForm();
    cy.get('#codePostal').clear().type('abc');
    cy.contains("S'inscrire").click();

    cy.get('.toast--error').contains('Le formulaire contient des erreurs.');
    cy.contains('1 inscrit(s)'); // toujours 1, aucune creation
  });

  it("affiche une erreur reseau quand la creation echoue (mode offline)", () => {
    cy.intercept('GET', USERS, { statusCode: 200, body: [] }).as('getUsers');
    cy.intercept('POST', USERS, { statusCode: 500 }).as('createUser');
    cy.visit('/');
    cy.wait('@getUsers');

    fillValidForm();
    cy.contains("S'inscrire").click();

    cy.wait('@createUser');
    cy.get('.toast--error').contains('Erreur reseau');
    cy.contains('0 inscrit(s)'); // la creation a echoue, compteur inchange
  });
});
