import { render, screen } from '@testing-library/react';
import { Coins } from 'lucide-react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders title, value and description', () => {
    render(
      <StatCard
        title="Your TEN Balance"
        value="123.45 TEN"
        icon={Coins}
        description="Estimated wallet holdings"
      />
    );

    expect(screen.getByText('Your TEN Balance')).toBeInTheDocument();
    expect(screen.getByText('123.45 TEN')).toBeInTheDocument();
    expect(screen.getByText('Estimated wallet holdings')).toBeInTheDocument();
  });

  it('renders up-trend badge when trendUp is true', () => {
    render(
      <StatCard
        title="Average APY"
        value="8.2%"
        icon={Coins}
        trend="+0.4%"
        trendUp
      />
    );

    expect(screen.getByText('+0.4%')).toBeInTheDocument();
  });
});
