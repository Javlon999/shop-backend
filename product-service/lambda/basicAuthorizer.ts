import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Event:', JSON.stringify(event));

  const token = event.authorizationToken;

  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    // Token format: "Basic base64(login:password)"
    const base64Credentials = token.split(' ')[1];

    if (!base64Credentials) {
      throw new Error('Unauthorized');
    }

    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [login, password] = decoded.split(':');

    console.log(`Checking credentials for login: ${login}`);

    const expectedPassword = process.env[login];
    const isAuthorized = expectedPassword !== undefined && expectedPassword === password;

    return generatePolicy(
      base64Credentials,
      isAuthorized ? 'Allow' : 'Deny',
      event.methodArn
    );
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Unauthorized');
  }
};

const generatePolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};