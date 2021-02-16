const servers = require('../../storage/servers');

describe('Test Servers Persistance', () => {
  it('Should create and get result server', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    server.addServer(server1);
    const result = server.getServer(server1.id);

    expect(result);
    done();
  });

  it('Should update and get result server', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    server.addServer(server1);
    server1.name = 'test2';
    server.addServer(server1);
    const result = server.getServer(server1.id);

    expect(result.name === 'test2');
    done();
  });

  it('Should create and get result client config', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const clientId = '123abc';
    server.addServer(server1);
    server.addClientId(server1, clientId);
    const result = server.getClientId(server1);
    expect(result === '123abc');
    done();
  });

  it('Should create and get an access token', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const token1 = {
      jwt: 'bearer asdf1234',
      exp: Date.now() + 500
    };
    server.addServer(server1);
    server.addAccessToken(server1, token1);
    const result = await server.getAccessToken(server1);
    expect(result === 'bearer asdf1234');
    done();
  });

  it('Should not return an expired token', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const token1 = {
      jwt: 'bearer asdf1234',
      exp: Date.now() - 1
    };
    server.addServer(server1);
    server.addAccessToken(server1, token1);
    const result = await server.getAccessToken(server1);
    expect(result === null);
    done();
  });

  it('Should clear generated access token', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const token1 = {
      jwt: 'bearer asdf1234',
      exp: Date.now() + 500
    };
    server.addServer(server1);
    server.addAccessToken(server1, token1);
    let result = await server.getAccessToken(server1);
    expect(result.jwt === 'bearer asdf1234');
    server.clearAccessToken(server1);
    result = await server.getAccessToken(server1);
    expect(result === null);
    done();
  });

  it('Should create and get key', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const key1 = '123keyabc';
    server.addServer(server1);
    server.addServerKey(server1, key1);
    const result = server.getServerKey(server1);
    expect(result === '123keyabc');
    done();
  });

  it('Should delete server', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };

    server.addServer(server1);
    let result = server.getServer(server1.id);
    expect(result[0]);
    server.deleteServer(server1);
    result = server.getServer(server1.id);
    done();
  });
});
