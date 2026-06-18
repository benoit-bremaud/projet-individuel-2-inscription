import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { App } from './App';
import { deleteRegistrant, fetchRegistrants, fetchRegistrantsAdmin, login } from './api';

// Tout le module API est simule : la partie admin (login JWT, liste complete avec PII,
// suppression) est pilotee sans appel reseau.
jest.mock('./api');

const ADMIN_RECORD = {
  id: 1,
  nom: 'Curie',
  prenom: 'Marie',
  email: 'marie.curie@ynov.com',
  date_naissance: '1867-11-07',
  ville: 'Paris',
  code_postal: '75005',
};

beforeEach(() => {
  fetchRegistrants.mockResolvedValue([]);
});

afterEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

async function renderApp() {
  render(<App />);
  await act(async () => {});
}

/** Renders, opens the login form and submits valid admin credentials. */
async function logInAsAdmin() {
  login.mockResolvedValue({ access_token: 'jwt-token' });
  fetchRegistrantsAdmin.mockResolvedValue([ADMIN_RECORD]);
  await renderApp();
  fireEvent.click(screen.getByRole('button', { name: /espace admin/i }));
  fireEvent.change(screen.getByLabelText(/email administrateur/i), {
    target: { value: 'loise.fenoll@ynov.com' },
  });
  fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
  });
}

describe('admin space', () => {
  test('opens the login form on demand', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('button', { name: /espace admin/i }));

    expect(screen.getByLabelText(/email administrateur/i)).toBeInTheDocument();
  });

  test('cancels the login form', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: /espace admin/i }));

    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));

    expect(screen.getByRole('button', { name: /espace admin/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/email administrateur/i)).not.toBeInTheDocument();
  });

  test('logs in and shows the full registrant table (with PII)', async () => {
    await logInAsAdmin();

    expect(login).toHaveBeenCalledWith('loise.fenoll@ynov.com', 'secret');
    expect(await screen.findByText('marie.curie@ynov.com')).toBeInTheDocument();
    expect(screen.getByText('75005')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se deconnecter/i })).toBeInTheDocument();
  });

  test('shows an error toast when the login fails', async () => {
    login.mockRejectedValue(new Error('401'));
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: /espace admin/i }));
    fireEvent.change(screen.getByLabelText(/email administrateur/i), {
      target: { value: 'loise.fenoll@ynov.com' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'bad' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/identifiants invalides/i);
  });

  test('deletes a registrant from the admin table', async () => {
    await logInAsAdmin();
    await screen.findByText('marie.curie@ynov.com');
    deleteRegistrant.mockResolvedValue();
    fetchRegistrantsAdmin.mockResolvedValue([]);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));
    });

    expect(deleteRegistrant).toHaveBeenCalledWith(1, 'jwt-token');
  });

  test('shows an error toast when deletion fails', async () => {
    await logInAsAdmin();
    await screen.findByText('marie.curie@ynov.com');
    deleteRegistrant.mockRejectedValue(new Error('Network Error'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/erreur reseau/i);
  });

  test('logs out and hides the admin panel', async () => {
    await logInAsAdmin();
    await screen.findByText('marie.curie@ynov.com');

    fireEvent.click(screen.getByRole('button', { name: /se deconnecter/i }));

    expect(screen.queryByText('marie.curie@ynov.com')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /espace admin/i })).toBeInTheDocument();
  });

  test('loads the admin list on mount when a token is stored', async () => {
    sessionStorage.setItem('adminToken', 'jwt-token');
    fetchRegistrantsAdmin.mockResolvedValue([ADMIN_RECORD]);

    await renderApp();

    expect(fetchRegistrantsAdmin).toHaveBeenCalledWith('jwt-token');
    expect(await screen.findByText('marie.curie@ynov.com')).toBeInTheDocument();
  });

  test('logs out when the stored token is rejected', async () => {
    sessionStorage.setItem('adminToken', 'expired');
    fetchRegistrantsAdmin.mockRejectedValue(new Error('401'));

    await renderApp();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /espace admin/i })).toBeInTheDocument();
    });
    expect(sessionStorage.getItem('adminToken')).toBeNull();
  });
});
