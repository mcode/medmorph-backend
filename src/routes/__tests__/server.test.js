const server = require('../../storage/servers');

describe('Test Servers Persistance', () => {
  it('Should create and get a server', async done => {
    let p = new server.Servers();
    const server1 = {
      id: 12345,
      name: 'test1'
    };
    p.addServer(server1);
    let a = p.getServer(server1.id);

    expect(a[0]);
    done();
  });

  it('Should update and get a server', async done => {
    let p = new server.Servers();
    const server1 = {
      id: 12345,
      name: 'test1'
    };
    p.addServer(server1);
    server1.type = 'KA';
    p.addServer(server1);
    let a = p.getServer(server1.id);

    expect(a[0].type === 'KA');
    done();
  });

  it('Should create and get a client config', async done => {
    let p = new server.Servers();
    const server1 = {
      id: 12345,
      name: 'test1'
    };
    const config1 = {
      cId: 123,
      alg: 'RS384'
    };
    p.addServer(server1);
    p.addClientConfiguration(server1, config1);
    let a = p.getClientConfiguration(server1);
    expect(a[0].alg === 'RS384');
    done();
  });

  it('Should create and get an access token', async done => {
    let p = new server.Servers();
    const server1 = {
      id: 12345,
      name: 'test1'
    };
    const token1 = {
      jwt: 'bearer asdf1234',
      exp: Date.now() + 500
    };
    p.addServer(server1);
    p.addAccessToken(server1, token1);
    let a = p.getAccessToken(server1);
    expect(a.jwt === 'bearer asdf1234');
    done();
  });

  it('Should not return an expired token', async done => {
    let p = new server.Servers();
    const server1 = {
      id: 12345,
      name: 'test1'
    };
    const token1 = {
      jwt: 'bearer asdf1234',
      exp: Date.now() - 1
    };
    p.addServer(server1);
    p.addAccessToken(server1, token1);
    let a = p.getAccessToken(server1);
    expect(a === null);
    done();
  });

  it('Should clear a generated access token', async done => {
    let p = new server.Servers();
    const server1 = {
      id: 12345,
      name: 'test1'
    };
    const token1 = {
      jwt: 'bearer asdf1234',
      exp: Date.now() + 500
    };
    p.addServer(server1);
    p.addAccessToken(server1, token1);
    let a = p.getAccessToken(server1);
    expect(a.jwt === 'bearer asdf1234');
    p.clearTokens(server1);
    a = p.getAccessToken(server1);
    expect(a === null);
    done();
  });

  it('Should create and get a key', async done => {
    let p = new server.Servers();
    const server1 = {
      id: 12345,
      name: 'test1'
    };
    const key1 = {
      key: '123keyabc'
    };
    p.addServer(server1);
    p.addServerKeys(server1, key1);
    let a = p.getServerKeys(server1);
    expect(a[0].key === '123keyabc');
    done();
  });

  it('Should delete all references to a server when a server is deleted', async done => {
    let p = new server.Servers();
    const server1 = {
      id: 12345,
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
    p.addServer(server1);
    let a = p.getServer(server1.id);
    expect(a[0]);

    p.addClientConfiguration(server1, config1);
    a = p.getClientConfiguration(server1);
    expect(a[0].alg === 'RS384');

    p.addAccessToken(server1, token1);
    a = p.getAccessToken(server1);
    expect(a.jwt === 'bearer asdf1234');

    p.addServerKeys(server1, key1);
    a = p.getServerKeys(server1);
    expect(a[0].key === '123keyabc');

    p.deleteServer(server1);
    a = p.getServer(server1.id);
    expect(a === null);
    a = p.getClientConfiguration(server1);
    expect(a === null);
    a = p.getAccessToken(server1);
    expect(a === null);
    a = p.getServerKeys(server1);
    expect(a === null);
    done();
  });
});
