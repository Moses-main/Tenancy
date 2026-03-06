import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../lib/ThemeContext';
import { AuthProvider } from '../lib/AuthContext';
import Layout from './Layout';

describe('Layout', () => {
  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <ThemeProvider>
            {component}
          </ThemeProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders TENANCY Protocol branding', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    expect(screen.getByText('TENANCY')).toBeInTheDocument();
    expect(screen.getByText('Protocol')).toBeInTheDocument();
  });

  it('renders navigation items', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    // Check for navigation items that actually exist
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('displays network indicator', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    // Should show network status
    expect(screen.getByText(/Base Sepolia|Ethereum Sepolia/)).toBeInTheDocument();
  });
});
