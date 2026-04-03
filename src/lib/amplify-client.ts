
import { Amplify } from 'aws-amplify';

const configureAmplify = () => {
  // Amplify configuration
  if (
    process.env.NEXT_PUBLIC_APPSYNC_GRAPHQL_URL &&
    process.env.NEXT_PUBLIC_APPSYNC_API_KEY
  ) {
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: process.env.NEXT_PUBLIC_APPSYNC_GRAPHQL_URL,
          region: 'us-east-1', // Assuming us-east-1, update if different
          apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY,
          defaultAuthMode: 'apiKey',
        },
      },
    });
    // Amplify configured
  } else {
    console.warn('Amplify configuration skipped: Missing environment variables.');
  }
};

export default configureAmplify;
