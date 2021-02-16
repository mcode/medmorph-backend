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

    expect(result[0]);
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
    server1.type = 'KA';
    server.addServer(server1);
    const result = server.getServer(server1.id);

    expect(result[0].type === 'KA');
    done();
  });

  it('Should create and get result client config', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const config1 = {
      cId: 123,
      alg: 'RS384'
    };
    server.addServer(server1);
    server.addClientConfiguration(server1, config1);
    const result = server.getClientConfiguration(server1);
    expect(result[0].alg === 'RS384');
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
    expect(result.jwt === 'bearer asdf1234');
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

  it('Should clear result generated access token', async done => {
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
    server.clearTokens(server1);
    result = await server.getAccessToken(server1);
    expect(result === null);
    done();
  });

  it('Should create and get result key', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const key1 = {
      key: '123keyabc'
    };
    server.addServer(server1);
    server.addServerKeys(server1, key1);
    const result = server.getServerKeys(server1);
    expect(result[0].key === '123keyabc');
    done();
  });

  it('Should delete all references to result server when result server is deleted', async done => {
    const server = new servers.Servers();
    const server1 = {
      id: 12345,
      endpoint: 'www.example.com',
      name: 'test1'
    };
    const config1 = {
      cId: 123,
      alg: 'RS384'
    };
    const token1 = {
      jwt: 'bearer asdf1234',
      exp: Date.now() + 500
    };
    const key1 = {
      key: '123keyabc'
    };
    server.addServer(server1);
    let result = server.getServer(server1.id);
    expect(result[0]);

    server.addClientConfiguration(server1, config1);
    result = server.getClientConfiguration(server1);
    expect(result[0].alg === 'RS384');

    server.addAccessToken(server1, token1);
    result = server.getAccessToken(server1);
    expect(result.jwt === 'bearer asdf1234');

    server.addServerKeys(server1, key1);
    result = server.getServerKeys(server1);
    expect(result[0].key === '123keyabc');

    server.deleteServer(server1);
    result = server.getServer(server1.id);
    expect(result === null);
    result = server.getClientConfiguration(server1);
    expect(result === null);
    result = server.getAccessToken(server1);
    expect(result === null);
    result = server.getServerKeys(server1);
    expect(result === null);
    done();
  });
});
