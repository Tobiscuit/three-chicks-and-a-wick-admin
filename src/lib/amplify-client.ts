
import { Amplify } from 'aws-amplify';

const configureAmplify = () => {
  if (
    process.env.NEXT_PUBLIC_APPSYNC_GRAPHQL_URL &&
    process.env.NEXT_PUBLIC_APPSYNC_API_KEY
  ) {
    Amplify.configure({
      aws_appsync_graphqlEndpoint: process.env.NEXT_PUBLIC_APPSYNC_GRAPHQL_URL,
      aws_appsync_region: 'us-east-1', // Assuming us-east-1, update if different
      aws_appsync_authenticationType: 'API_KEY',
      aws_appsync_apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY,
    });
    console.log('Amplify configured successfully');
  } else {
    console.warn('Amplify configuration skipped: Missing environment variables.');
  }
};

export default configureAmplify;
