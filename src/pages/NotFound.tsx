import React from 'react';
    import { Link } from 'react-router-dom';
    import { AlertCircle } from 'lucide-react';
    import Layout from '../components/Layout';

    export default function NotFound() {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-muted-foreground" />
            <h1 className="text-4xl font-bold tracking-tight">404 - Page Not Found</h1>
            <p className="text-muted-foreground max-w-md">
              The page you are looking for does not exist or has been moved. 
              Check the URL or return to the dashboard.
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 mt-4"
            >
              Return to Dashboard
            </Link>
          </div>
        </Layout>
      );
    }