const client = require('../../utils/client');
const servers = require('../../storage/servers');

describe('Test Servers Persistance', () => {
  it('Should create and get result server', async done => {
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    servers.addServer(server1);
    const result = servers.getServerById(server1.id);

    expect(result);
    done();
  });

  it('Should get an invalid server', async done => {
    const result = servers.getServerById(1);
    expect(result === undefined);
    done();
  });

  it('Should get server by url and test get all servers', async done => {
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const server2 = {
      id: 23456,
      endpoint: 'www.example2.com',
      name: 'test2'
    };
    servers.addServer(server1);
    servers.addServer(server2);
    let result = servers.getServerByUrl('www.example2.com');

    expect(result.id === 23456);
    expect(result.name === 'test2');

    result = servers.getServers();
    expect(result.length === 2);
    done();
  });

  it('Should update and get result server', async done => {
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    servers.addServer(server1);
    server1.name = 'test2';
    servers.addServer(server1);
    const result = servers.getServerById(server1.id);

    expect(result.name === 'test2');
    done();
  });

  it('Should create and get result client config', async done => {
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const clientId = '123abc';
    servers.addServer(server1);
    servers.addClientId(server1, clientId);
    const result = servers.getClientId(server1);
    expect(result === '123abc');
    done();
  });

  it('Should create and get an access token', async done => {
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const token1 = {
      token: 'bearer asdf1234',
      exp: Date.now() + 500
    };
    servers.addServer(server1);
    servers.addAccessToken(server1, token1.token, token1.exp);
    const result = await client.getAccessToken(server1.endpoint);
    expect(result === 'bearer asdf1234');
    done();
  });

  it('Should not return an expired token', async done => {
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const token1 = {
      token: 'bearer asdf1234',
      exp: Date.now() - 1
    };
    servers.addServer(server1);
    servers.addAccessToken(server1, token1.token, token1.exp);

    // expect an exception as we are unable to reconnect to the server
    try {
      await client.getAccessToken(server1);
    } catch (e) {
      expect(e !== null);
    }
    done();
  });

  it('Should delete server', async done => {
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };

    servers.addServer(server1);
    let result = servers.getServerById(server1.id);
    expect(result[0]);
    servers.deleteServer(server1);
    result = servers.getServerById(server1.id);
    done();
  });
});

describe('Test persistence with errors', () => {
  global.console.error = jest.fn();

  it('Should clear generated access token', async done => {
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const token1 = {
      token: 'bearer asdf1234',
      exp: Date.now() + 500
    };
    servers.addServer(server1);
    servers.addAccessToken(server1, token1.token, token1.exp);
    const result = await client.getAccessToken(server1.endpoint);
    expect(result.token === 'bearer asdf1234');
    servers.clearAccessToken(server1);
    // expect an exception as we are unable to reconnect to the server
    try {
      await servers.getAccessToken(server1);
    } catch (e) {
      expect(e !== null);
    }
    done();
  });
});
