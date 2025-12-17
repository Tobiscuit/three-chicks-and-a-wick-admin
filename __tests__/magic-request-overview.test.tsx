import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MagicRequestOverview } from '@/components/magic-request/overview';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
  },
}));

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the storefront API calls
jest.mock('@/lib/storefront-appsync', () => ({
  getFeatureFlag: jest.fn(),
  setFeatureFlag: jest.fn(),
}));

import { getFeatureFlag, setFeatureFlag } from '@/lib/storefront-appsync';

const mockGetFeatureFlag = getFeatureFlag as jest.MockedFunction<typeof getFeatureFlag>;
const mockSetFeatureFlag = setFeatureFlag as jest.MockedFunction<typeof setFeatureFlag>;

describe('MagicRequestOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads with disabled state initially', async () => {
    mockGetFeatureFlag.mockResolvedValue({ value: false });
    
    render(<MagicRequestOverview />);
    
    await waitFor(() => {
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  it('toggles to enabled when switch is clicked', async () => {
    mockGetFeatureFlag.mockResolvedValue({ value: false });
    mockSetFeatureFlag.mockResolvedValue(undefined);
    
    render(<MagicRequestOverview />);
    
    await waitFor(() => {
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    await waitFor(() => {
      expect(mockSetFeatureFlag).toHaveBeenCalledWith('enableMagicRequest', true);
    });
  });

  it('shows loading state initially', () => {
    mockGetFeatureFlag.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<MagicRequestOverview />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
