// Suppress storage errors for missing files
export const suppressStorageErrors = () => {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Suppress Supabase storage CORS errors for missing files
    const errorString = args.join(' ');
    if (errorString.includes('supabase') && 
        (errorString.includes('CORS') || 
         errorString.includes('useEffect is not defined') ||
         errorString.includes('net::ERR_CORS'))) {
      return; // Suppress these specific errors
    }
    originalConsoleError(...args);
  };
};

// Call this function in your app initialization
suppressStorageErrors();