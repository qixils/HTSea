const loginURL = `https://discord.com/oauth2/authorize?response_type=code&client_id=${process.env.REACT_APP_CLIENT_ID}&scope=identify%20guilds&redirect_uri=${process.env.REACT_APP_API_URL}/api/users/register&prompt=consent`;

export default loginURL;
